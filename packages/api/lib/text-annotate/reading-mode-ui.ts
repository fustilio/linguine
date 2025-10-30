/**
 * Reading mode UI manager
 * Creates and manages the reading mode interface
 */

import { getImagesForQuery } from './image-fetcher.js';
import { getReadingModeStyles } from './styles.js';
import type { AnnotatedChunk } from './types.js';

export class ReadingModeUI {
  private container: HTMLElement | null = null;
  private contentArea: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressPhase: string | null = null;
  private isInitialized = false;
  private plainText = '';
  private totalChunks = 0;
  private annotatedChunks: AnnotatedChunk[] = [];
  private debugVisible = false;
  private debugPanel: HTMLElement | null = null;
  private lastDebugData: Record<string, unknown> | null = null;
  private phaseTimes: Partial<
    Record<'extract' | 'detect' | 'segment' | 'prechunk' | 'translate' | 'finalize', number>
  > = {};
  // Runtime configuration
  private config: { showImages: boolean; showPrefixes: boolean; imageSource: 'wikimedia' } = {
    showImages: true,
    showPrefixes: true,
    imageSource: 'wikimedia',
  };

  private readonly storageKey = 'text-annotate-reading-mode-config';
  private readonly settingsKey = 'text-annotate-reading-mode-settings';

  // Reading settings
  private settings: {
    fontSizePx: number;
    lineHeight: number;
    maxWidthCh: number;
    theme: 'light' | 'dark' | 'sepia';
  } = {
    fontSizePx: 18,
    lineHeight: 1.6,
    maxWidthCh: 65,
    theme: 'light',
  };

  // Scroll lock bookkeeping
  private isScrollLocked = false;
  private lockedScrollY = 0;
  private lucideReady = false;

  private async initLucide(): Promise<void> {
    if (this.lucideReady) return;
    try {
      // Dynamically import to avoid loading unless needed
      const mod: any = await import('lucide');
      if (mod && typeof mod.createIcons === 'function') {
        mod.createIcons({ icons: mod.icons });
        this.lucideReady = true;
      }
    } catch {
      // No-op if lucide isn't available in this context
    }
  }

  /**
   * Initialize reading mode UI
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Inject styles
    this.injectStyles();

    // Create container
    this.container = this.createContainer();
    document.body.appendChild(this.container);
    document.addEventListener('keydown', this.onKeyDown, true);
    this.isInitialized = true;

    // Load persisted configuration (fire-and-forget)
    Promise.all([this.loadConfig(), this.loadSettings()])
      .then(() => {
        this.applyConfigToOpenTooltips();
        this.applySettingsToContainer();
      })
      .catch(() => {});
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const isVisible = !!this.container && this.container.style.display !== 'none';
    if (e.key === 'Escape') {
      this.hide();
    } else if (e.key === 'Tab' && isVisible) {
      e.preventDefault();
      this.toggleDebugPanel();
    } else if (isVisible) {
      const isMeta = e.ctrlKey || e.metaKey;
      // Font size
      if (isMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        e.stopPropagation();
        this.adjustFontSize(+1);
        return;
      }
      if (isMeta && e.key === '-') {
        e.preventDefault();
        e.stopPropagation();
        this.adjustFontSize(-1);
        return;
      }
      // Column width
      if (isMeta && e.key === ']') {
        e.preventDefault();
        e.stopPropagation();
        this.adjustMaxWidth(+5);
        return;
      }
      if (isMeta && e.key === '[') {
        e.preventDefault();
        e.stopPropagation();
        this.adjustMaxWidth(-5);
        return;
      }
      // Theme cycle
      if (!isMeta && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        e.stopPropagation();
        this.cycleTheme();
        return;
      }
    }
  };

  /**
   * Display plain text first, then progressively add annotations
   */
  public displayPlainTextWithProgress(
    title: string | undefined,
    plainText: string,
    totalChunks: number,
    onClose?: () => void,
  ): void {
    if (!this.container) {
      this.initialize();
    }

    if (!this.container) {
      throw new Error('Failed to initialize reading mode UI');
    }

    // Store state
    this.plainText = plainText;
    this.totalChunks = totalChunks;
    this.annotatedChunks = [];

    // Clear previous content
    this.container.innerHTML = '';

    // Create header with progress bar and controls
    const header = this.createHeaderWithProgress(title, onClose);
    this.container.appendChild(header);

    // Create content area with plain text
    this.contentArea = this.createPlainTextContent(plainText);
    this.container.appendChild(this.contentArea);

    // Apply settings to freshly created DOM
    this.applySettingsToContainer();
    // Lock page scroll while reading mode visible
    this.lockScroll();
  }

  /**
   * Set total chunks for progress tracking
   */
  public setTotalChunks(total: number): void {
    // Lock only once when first non-zero value arrives
    if (this.totalChunks === 0 && total > 0) {
      this.totalChunks = total;
    }
  }

  /**
   * Add annotations progressively
   */
  public addAnnotations(
    chunks: AnnotatedChunk[],
    isComplete: boolean,
    phase?: string,
    metrics?: {
      literalCount?: number;
      contextualCount?: number;
      literalTimeMs?: number;
      contextualTimeMs?: number;
      batchTimeMs?: number;
    },
  ): void {
    if (!this.contentArea) {
      console.warn('[ReadingModeUI] Content area not initialized');
      return;
    }

    // Store new chunks
    this.annotatedChunks = [...chunks];

    // Update progress bar
    this.updateProgressBar({ completed: chunks.length, total: this.totalChunks, isComplete, phase });
    if (metrics) {
      this.updateDebugPanel({ phase, ...metrics, completed: chunks.length, total: this.totalChunks });
    }

    // Incrementally wrap ranges for each new chunk
    for (const chunk of chunks) {
      // Skip whitespace-only chunks
      if (!chunk.text || chunk.text.trim().length === 0) continue;
      if (typeof chunk.start === 'number' && typeof chunk.end === 'number' && chunk.end > chunk.start) {
        const el = this.createChunkElement(chunk);
        this.wrapRange(chunk.start, chunk.end, el);
      }
    }

    console.log(`[ReadingModeUI] Updated with ${chunks.length} annotated chunks, complete: ${isComplete}`);
  }

  /**
   * Display annotated text in reading mode (legacy method)
   */
  public displayAnnotation(title: string | undefined, chunks: AnnotatedChunk[], onClose?: () => void): void {
    if (!this.container) {
      this.initialize();
    }

    if (!this.container) {
      throw new Error('Failed to initialize reading mode UI');
    }

    // Clear previous content
    this.container.innerHTML = '';

    // Create header
    const header = this.createHeader(title, onClose);
    this.container.appendChild(header);

    // Create content area
    const content = this.createContentArea(chunks);
    this.container.appendChild(content);
  }

  /**
   * Hide reading mode
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.unlockScroll();
  }

  /**
   * Show reading mode
   */
  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
    this.applySettingsToContainer();
    this.lockScroll();
  }

  /**
   * Destroy reading mode UI
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.isInitialized = false;
    this.unlockScroll();
  }

  /**
   * Create container element
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'text-annotate-reading-mode';
    container.className = 'text-annotate-reading-mode';
    container.style.display = 'none';
    // Ensure container is the scrollable viewport and blocks page scroll bleed
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.height = '100vh';
    container.style.overflow = 'auto';
    (container.style as any).overscrollBehavior = 'contain';
    container.style.zIndex = '2147483647';
    return container;
  }

  /**
   * Create header with title, progress bar, and close button
   */
  private createHeaderWithProgress(title: string | undefined, onClose?: () => void): HTMLElement {
    const header = document.createElement('div');
    header.className = 'text-annotate-header';

    // Top row: title + close
    const row = document.createElement('div');
    row.className = 'text-annotate-header-row';

    const titleEl = document.createElement('h1');
    titleEl.className = 'text-annotate-title';
    titleEl.textContent = title || '';
    row.appendChild(titleEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'text-annotate-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => {
      if (onClose) {
        onClose();
      }
      this.hide();
    };
    row.appendChild(closeBtn);

    header.appendChild(row);

    // Second row: centered progress
    this.progressBar = this.createProgressBar();
    header.appendChild(this.progressBar);

    // Controls row: typography/layout controls and toggles
    const controls = document.createElement('div');
    controls.className = 'text-annotate-controls';
    controls.style.display = 'flex';
    controls.style.gap = '12px';
    controls.style.alignItems = 'center';
    controls.style.justifyContent = 'center';
    controls.style.marginTop = '4px';

    // Icon button helper (styled similarly to popup buttons)
    const makeIconButton = (iconHtml: string, title: string, isRawHtml: boolean = true): HTMLButtonElement => {
      const btn = document.createElement('button');
      if (isRawHtml) btn.innerHTML = iconHtml; else btn.textContent = iconHtml;
      btn.title = title;
      btn.className = 'ta-icon-btn';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '12px';
      return btn;
    };

    // Font size controls (Lucide runtime icons)
    const decFont = makeIconButton('<i data-lucide="a-arrow-down" class="ta-icon"></i>', 'Decrease font size (Ctrl/Cmd + -)');
    const incFont = makeIconButton('<i data-lucide="a-arrow-up" class="ta-icon"></i>', 'Increase font size (Ctrl/Cmd + =)');
    decFont.onclick = () => this.adjustFontSize(-1);
    incFont.onclick = () => this.adjustFontSize(+1);
    controls.appendChild(decFont);
    controls.appendChild(incFont);

    // Line height controls (Lucide list-chevrons-down-up)
    const decLine = makeIconButton('<i data-lucide="list-chevrons-down-up" class="ta-icon"></i>', 'Decrease line height');
    const incLine = makeIconButton('<i data-lucide="list-chevrons-up-down" class="ta-icon"></i>', 'Increase line height');
    decLine.onclick = () => this.adjustLineHeight(-0.05);
    incLine.onclick = () => this.adjustLineHeight(+0.05);
    controls.appendChild(decLine);
    controls.appendChild(incLine);

    // Column width controls (Lucide ruler-dimension-line)
    const nar = makeIconButton('<i data-lucide="fold-horizontal" class="ta-icon"></i>', 'Narrow column (Ctrl/Cmd + [)');
    const wid = makeIconButton('<i data-lucide="unfold-horizontal" class="ta-icon"></i>', 'Widen column (Ctrl/Cmd + ])');
    nar.onclick = () => this.adjustMaxWidth(-5);
    wid.onclick = () => this.adjustMaxWidth(+5);
    controls.appendChild(nar);
    controls.appendChild(wid);

    // Theme cycle (Lucide sun-moon)
    const themeBtn = makeIconButton('<i data-lucide="sun-moon" class="ta-icon"></i>', 'Cycle theme (T)');
    themeBtn.onclick = () => this.cycleTheme();
    controls.appendChild(themeBtn);

    // Show Images toggle (🖼)
    const imgBtn = makeIconButton('🖼', 'Toggle images');
    const updateImgBtn = () => {
      imgBtn.style.opacity = this.config.showImages ? '1' : '0.5';
    };
    updateImgBtn();
    imgBtn.onclick = () => {
      this.config.showImages = !this.config.showImages;
      updateImgBtn();
      this.applyConfigToOpenTooltips();
      this.saveConfig().catch(() => {});
    };
    controls.appendChild(imgBtn);

    // Show Prefixes toggle (🔤)
    const prefBtn = makeIconButton('🔤', 'Toggle "Literal:"/"Contextual:" prefixes');
    const updatePrefBtn = () => {
      prefBtn.style.opacity = this.config.showPrefixes ? '1' : '0.5';
    };
    updatePrefBtn();
    prefBtn.onclick = () => {
      this.config.showPrefixes = !this.config.showPrefixes;
      updatePrefBtn();
      this.applyConfigToOpenTooltips();
      this.saveConfig().catch(() => {});
    };
    controls.appendChild(prefBtn);

    // Image Source (future-proof, currently only Wikimedia)
    const srcLabel = document.createElement('span');
    srcLabel.textContent = 'Image source: Wikimedia';
    controls.appendChild(srcLabel);

    header.appendChild(controls);
    // Initialize Lucide icons for the controls
    this.initLucide().catch(() => {});

    return header;
  }

  /**
   * Create progress bar element
   */
  private createProgressBar(): HTMLElement {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'text-annotate-progress-container';

    const progressLabel = document.createElement('div');
    progressLabel.className = 'text-annotate-progress-label';
    progressLabel.textContent = 'Loading annotations...';
    progressContainer.appendChild(progressLabel);

    const progressBar = document.createElement('div');
    progressBar.className = 'text-annotate-progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'text-annotate-progress-fill';
    progressFill.style.width = '0%';
    progressBar.appendChild(progressFill);

    progressContainer.appendChild(progressBar);

    return progressContainer;
  }

  /**
   * Update progress bar
   */
  private updateProgressBar({
    completed,
    total,
    isComplete,
    phase,
  }: {
    completed: number;
    total?: number;
    isComplete: boolean;
    phase?: string;
  }): void {
    if (!this.progressBar) return;

    const progressFill = this.progressBar.querySelector('.text-annotate-progress-fill') as HTMLElement;
    const progressLabel = this.progressBar.querySelector('.text-annotate-progress-label') as HTMLElement;

    if (!progressFill || !progressLabel) return;

    // Lock denominator on first non-zero total received
    if (typeof total === 'number' && total > 0) {
      this.setTotalChunks(total);
    }

    const effectiveTotal = Math.max(this.totalChunks, completed);
    const percentage = effectiveTotal > 0 ? Math.min((completed / effectiveTotal) * 100, 100) : 0;
    progressFill.style.width = `${percentage}%`;

    if (isComplete) {
      progressLabel.textContent = 'Annotations complete!';
      // Fade out to avoid layout shift but keep space
      setTimeout(() => {
        if (this.progressBar) {
          (this.progressBar as HTMLElement).style.opacity = '0';
          (this.progressBar as HTMLElement).style.pointerEvents = 'none';
        }
      }, 1500);
    } else {
      const phaseLabel = phase ? `${phase}` : 'loading';
      progressLabel.textContent = `${phaseLabel}... ${Math.min(completed, effectiveTotal)}/${effectiveTotal}`;
    }
  }

  private toggleDebugPanel(): void {
    if (!this.container) return;
    if (!this.debugPanel) {
      this.debugPanel = document.createElement('div');
      this.debugPanel.className = 'text-annotate-debug-panel';
      this.container.appendChild(this.debugPanel);
    }
    this.debugVisible = !this.debugVisible;
    this.debugPanel.style.display = this.debugVisible ? 'block' : 'none';
    if (this.debugVisible && this.lastDebugData) {
      this.updateDebugPanel(this.lastDebugData);
    }
  }

  private updateDebugPanel(data: Record<string, unknown>): void {
    if (!this.debugPanel) return;
    this.lastDebugData = data;
    type DebugMetrics = {
      phase?: string;
      completed?: number;
      total?: number;
      literalCount?: number;
      contextualCount?: number;
      literalTimeMs?: number;
      contextualTimeMs?: number;
      batchTimeMs?: number;
      phaseTimes?: Partial<Record<'extract' | 'detect' | 'segment' | 'prechunk' | 'translate' | 'finalize', number>>;
    };
    const {
      phase,
      completed,
      total,
      literalCount,
      contextualCount,
      literalTimeMs,
      contextualTimeMs,
      batchTimeMs,
      phaseTimes,
    } = data as DebugMetrics;

    if (phaseTimes && typeof phaseTimes === 'object') {
      this.phaseTimes = { ...this.phaseTimes, ...phaseTimes };
    }
    const phasesOrder: Array<keyof typeof this.phaseTimes> = [
      'extract',
      'detect',
      'segment',
      'prechunk',
      'translate',
      'finalize',
    ];
    const phasesRows = phasesOrder
      .filter(p => this.phaseTimes[p] != null)
      .map(p => `<div class="dbg-row"><strong>${p}:</strong> ${Math.round(Number(this.phaseTimes[p]))} ms</div>`)
      .join('');

    this.debugPanel.innerHTML = `
      <div class="dbg-row"><strong>Phase:</strong> ${phase ?? '-'} | <strong>${completed ?? 0}/${total ?? 0}</strong></div>
      ${phasesRows}
      <div class="dbg-row"><strong>Batch:</strong> ${Math.round(Number(batchTimeMs) || 0)} ms</div>
      <div class="dbg-row"><strong>Literal:</strong> ${literalCount ?? 0} ops, ${Math.round(Number(literalTimeMs) || 0)} ms</div>
      <div class="dbg-row"><strong>Contextual:</strong> ${contextualCount ?? 0} ops, ${Math.round(Number(contextualTimeMs) || 0)} ms</div>
      <div class="dbg-hint">Press Tab to hide</div>
    `;
  }

  /**
   * Create plain text content area
   */
  private createPlainTextContent(plainText: string): HTMLElement {
    const content = document.createElement('div');
    content.className = 'text-annotate-content';
    // Constrain readable width via settings
    content.style.margin = '0 auto';
    content.style.maxWidth = `${this.settings.maxWidthCh}ch`;
    content.style.fontSize = `${this.settings.fontSizePx}px`;
    content.style.lineHeight = String(this.settings.lineHeight);

    const textEl = document.createElement('div');
    textEl.className = 'text-annotate-plain-text';
    // Override default CSS to reflect settings
    textEl.style.fontSize = `${this.settings.fontSizePx}px`;
    textEl.style.lineHeight = String(this.settings.lineHeight);

    // Render each character in its own span to allow range wrapping later
    for (let i = 0; i < plainText.length; i++) {
      const ch = plainText[i];
      const s = document.createElement('span');
      s.className = 'txt-char';
      s.setAttribute('data-idx', String(i));
      s.textContent = ch;
      textEl.appendChild(s);
    }

    content.appendChild(textEl);
    return content;
  }

  /**
   * Wrap a [start, end) range of character spans into a single element
   */
  private wrapRange(start: number, end: number, wrapper: HTMLElement): void {
    if (!this.contentArea) return;
    const container = this.contentArea.querySelector('.text-annotate-plain-text');
    if (!container) return;

    // Find first span at or after start
    const first = container.querySelector(`span.txt-char[data-idx="${start}"]`) as HTMLElement | null;
    if (!first) return;

    // If already wrapped (not a char span), skip
    if (!first.classList.contains('txt-char')) {
      return;
    }

    // Collect spans until end (exclusive)
    const toWrap: HTMLElement[] = [];
    for (let i = start; i < end; i++) {
      const el = container.querySelector(`span.txt-char[data-idx="${i}"]`) as HTMLElement | null;
      if (!el || !el.classList.contains('txt-char')) {
        // Already wrapped or missing, abort this range
        return;
      }
      toWrap.push(el);
    }

    // Compose combined text but do not destroy wrapper children (tooltip etc.)
    let combined = '';
    toWrap.forEach(el => {
      combined += el.textContent || '';
    });
    // Ensure first child is a text node holding the visible text
    if (wrapper.firstChild && wrapper.firstChild.nodeType === Node.TEXT_NODE) {
      wrapper.firstChild.nodeValue = combined;
    } else {
      wrapper.insertBefore(document.createTextNode(combined), wrapper.firstChild || null);
    }

    const firstNode = toWrap[0];
    container.insertBefore(wrapper, firstNode);
    toWrap.forEach(el => el.remove());
  }

  /**
   * Create header with title and close button
   */
  private createHeader(title: string | undefined, onClose?: () => void): HTMLElement {
    const header = document.createElement('div');
    header.className = 'text-annotate-header';

    if (title) {
      const titleEl = document.createElement('h1');
      titleEl.className = 'text-annotate-title';
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'text-annotate-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close reading mode');
    closeBtn.onclick = () => {
      if (onClose) {
        onClose();
      }
      this.hide();
    };
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Create content area with annotated chunks
   */
  private createContentArea(chunks: AnnotatedChunk[]): HTMLElement {
    const content = document.createElement('div');
    content.className = 'text-annotate-content';
    content.style.margin = '0 auto';
    content.style.maxWidth = `${this.settings.maxWidthCh}ch`;
    content.style.fontSize = `${this.settings.fontSizePx}px`;
    content.style.lineHeight = String(this.settings.lineHeight);

    for (const chunk of chunks) {
      const chunkEl = this.createChunkElement(chunk);
      content.appendChild(chunkEl);
    }

    return content;
  }

  /**
   * Create element for a single chunk
   */
  private createChunkElement(chunk: AnnotatedChunk): HTMLElement {
    const span = document.createElement('span');
    span.className = 'text-annotate-chunk';

    if (chunk.translation.differs) {
      span.classList.add('text-annotate-chunk-differs');
    }

    span.textContent = chunk.text;
    span.setAttribute('data-literal', chunk.translation.literal);
    span.setAttribute('data-contextual', chunk.translation.contextual);

    // Create tooltip
    const tooltip = this.createTooltip(chunk);
    span.appendChild(tooltip);

    // Hover behavior with grace period: keep open while mouse is over span or tooltip
    let hideTimer: number | null = null;
    const showTooltip = () => {
      if (hideTimer != null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      // Close any other open tooltips before showing this one
      this.closeOtherTooltips(tooltip);
      tooltip.style.display = 'block';
      tooltip.style.pointerEvents = 'auto';
      if (!tooltip.getAttribute('data-images-loaded')) {
        this.loadImagesForChunkIntoTooltip(chunk, tooltip).catch(() => {});
      }
      // Append contextual line once available (no placeholder beforehand) only when they differ
      const differs = !!chunk.translation?.differs;
      const contextualText = chunk.translation?.contextual || '';
      if (differs && contextualText && !tooltip.querySelector('.text-annotate-tooltip-contextual')) {
        const contextualDiv = document.createElement('div');
        contextualDiv.className = 'text-annotate-tooltip-contextual';
        contextualDiv.textContent = this.config.showPrefixes ? `Contextual: ${contextualText}` : contextualText;
        tooltip.appendChild(contextualDiv);
      }
    };
    const scheduleHide = () => {
      if (hideTimer != null) {
        clearTimeout(hideTimer);
      }
      hideTimer = window.setTimeout(() => {
        const stillHovering = span.matches(':hover') || tooltip.matches(':hover');
        if (!stillHovering) {
          tooltip.style.display = 'none';
        }
        hideTimer = null;
      }, 400);
    };

    span.addEventListener('mouseenter', showTooltip);
    tooltip.addEventListener('mouseenter', showTooltip);
    span.addEventListener('mouseleave', scheduleHide);
    tooltip.addEventListener('mouseleave', scheduleHide);

    // Add click handler for text-to-speech
    span.addEventListener('click', e => {
      e.stopPropagation();
      this.speakText(chunk.text, chunk.language || 'en-US');
    });

    return span;
  }

  /**
   * Create tooltip element
   */
  private createTooltip(chunk: AnnotatedChunk): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'text-annotate-tooltip';
    tooltip.style.display = 'none';
    // Left-align text content by default
    tooltip.style.textAlign = 'left';

    // Image viewer container (populated lazily) - placed first
    const imgContainer = document.createElement('div');
    imgContainer.className = 'text-annotate-tooltip-image-viewer';
    imgContainer.style.display = 'none';
    imgContainer.style.alignItems = 'center';
    imgContainer.style.justifyContent = 'center';
    imgContainer.style.gap = '6px';
    imgContainer.style.marginTop = '6px';
    imgContainer.style.marginBottom = '6px';
    tooltip.appendChild(imgContainer);

    // Show literal first; omit contextual placeholder until needed
    const translationDiv = document.createElement('div');
    translationDiv.className = 'text-annotate-tooltip-translation';
    const same = !chunk.translation.differs;
    tooltip.setAttribute('data-same', same ? 'true' : 'false');
    if (same) {
      translationDiv.textContent = chunk.translation.contextual || chunk.translation.literal;
      translationDiv.style.color = '#ffffff';
    } else {
      translationDiv.textContent = this.config.showPrefixes
        ? `Literal: ${chunk.translation.literal}`
        : chunk.translation.literal;
      // Lighter blue for literal text
      translationDiv.style.color = '#3b82f6';
    }
    tooltip.appendChild(translationDiv);

    return tooltip;
  }

  private closeOtherTooltips(current: HTMLElement): void {
    const tooltips = document.querySelectorAll('.text-annotate-tooltip');
    tooltips.forEach(t => {
      const el = t as HTMLElement;
      if (el !== current) {
        el.style.display = 'none';
      }
    });
  }

  private async loadImagesForChunkIntoTooltip(chunk: AnnotatedChunk, tooltip: HTMLElement): Promise<void> {
    const imgContainer = tooltip.querySelector('.text-annotate-tooltip-image-viewer') as HTMLElement | null;
    if (!imgContainer) return;

    // Build queries: contextual -> literal (English only); if not available, do nothing
    const sanitize = (s: string | undefined | null): string | null => {
      if (!s) return null;
      let q = s;
      // remove parenthetical notes
      q = q.replace(/\([^)]*\)/g, '');
      // choose first option before '/'
      q = q.split('/')[0];
      // choose first before ','
      q = q.split(',')[0];
      // keep only latin letters, spaces and hyphens
      q = q.replace(/[^a-zA-Z\-\s]/g, '').trim();
      if (!/[a-zA-Z]/.test(q)) return null;
      // collapse whitespace
      q = q.replace(/\s+/g, ' ').trim();
      return q || null;
    };

    const queries: string[] = [];
    const c = sanitize(chunk.translation?.contextual?.trim());
    const l = sanitize(chunk.translation?.literal?.trim());
    if (c) queries.push(c);
    if (l && l !== c) queries.push(l);
    if (queries.length === 0) {
      tooltip.setAttribute('data-images-loaded', 'true');
      return;
    }

    const collected: string[] = [];
    for (const q of queries) {
      if (!q || collected.length >= 3) break;
      const imgs = await getImagesForQuery(q, 3 - collected.length);
      for (const u of imgs) {
        if (!collected.includes(u)) collected.push(u);
        if (collected.length >= 3) break;
      }
    }

    if (!this.config.showImages || !collected.length) {
      tooltip.setAttribute('data-images-loaded', 'true');
      return;
    }

    // Render viewer
    let idx = 0;
    imgContainer.innerHTML = '';
    const img = document.createElement('img');
    img.src = collected[idx];
    img.alt = chunk.translation.contextual || chunk.translation.literal || chunk.text;
    img.style.width = '120px';
    img.style.height = '120px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    // Click image to cycle to next
    img.onclick = e => {
      e.stopPropagation();
      if (collected.length <= 1) return;
      idx = (idx + 1) % collected.length;
      img.src = collected[idx];
    };

    imgContainer.appendChild(img);
    imgContainer.style.display = 'flex';
    tooltip.setAttribute('data-images-loaded', 'true');
  }

  private applyConfigToOpenTooltips(): void {
    const tooltips = document.querySelectorAll('.text-annotate-tooltip');
    tooltips.forEach(t => {
      const tooltip = t as HTMLElement;
      // Update image container visibility
      const imgContainer = tooltip.querySelector('.text-annotate-tooltip-image-viewer') as HTMLElement | null;
      if (imgContainer) {
        if (
          this.config.showImages &&
          tooltip.getAttribute('data-images-loaded') === 'true' &&
          imgContainer.childElementCount > 0
        ) {
          imgContainer.style.display = 'flex';
        } else {
          imgContainer.style.display = 'none';
        }
      }
      // Update prefixes for literal/contextual
      const literalEl = tooltip.querySelector('.text-annotate-tooltip-translation') as HTMLElement | null;
      const contextualEl = tooltip.querySelector('.text-annotate-tooltip-contextual') as HTMLElement | null;
      if (literalEl) {
        const same = tooltip.getAttribute('data-same') === 'true';
        if (same) {
          // Keep single white line with no prefixes regardless of toggle
          const text = literalEl.textContent || '';
          const stripped = text.replace(/^\s*Literal:\s*/i, '');
          literalEl.textContent = stripped;
          literalEl.style.color = '#ffffff';
        } else {
          // Extract original text without prefix if previously set
          const text = literalEl.textContent || '';
          const stripped = text.replace(/^\s*Literal:\s*/i, '');
          literalEl.textContent = this.config.showPrefixes ? `Literal: ${stripped}` : stripped;
          literalEl.style.color = '#3b82f6';
        }
      }
      if (contextualEl) {
        const text = contextualEl.textContent || '';
        const stripped = text.replace(/^\s*Contextual:\s*/i, '');
        contextualEl.textContent = this.config.showPrefixes ? `Contextual: ${stripped}` : stripped;
      }
      tooltip.style.textAlign = 'left';
    });
  }

  private async loadConfig(): Promise<void> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<typeof this.config>;
      this.config.showImages = parsed.showImages ?? this.config.showImages;
      this.config.showPrefixes = parsed.showPrefixes ?? this.config.showPrefixes;
      if (parsed.imageSource) this.config.imageSource = parsed.imageSource;
    } catch {
      // ignore storage errors
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Speak text using Web Speech API
   */
  private speakText(text: string, language: string): void {
    if (!('speechSynthesis' in window)) {
      console.warn('[TextAnnotate] Text-to-speech not supported in this browser');
      return;
    }

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set language based on detected language
    utterance.lang = this.mapLanguageToSpeechLang(language);

    // Set voice properties
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to find a voice that matches the language
    const voices = speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      voice => voice.lang.startsWith(language.split('-')[0]) || voice.lang === language,
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    console.log(`[TextAnnotate] Speaking: "${text}" in ${utterance.lang}`);
    speechSynthesis.speak(utterance);
  }

  /**
   * Map language codes to speech synthesis language codes
   */
  private mapLanguageToSpeechLang(language: string): string {
    const langMap: Record<string, string> = {
      'th-TH': 'th-TH',
      th: 'th-TH',
      'zh-CN': 'zh-CN',
      zh: 'zh-CN',
      'en-US': 'en-US',
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      ja: 'ja-JP',
      ko: 'ko-KR',
    };

    return langMap[language] || 'en-US';
  }

  /**
   * Inject reading mode styles
   */
  private injectStyles(): void {
    // Check if styles already injected
    if (document.getElementById('text-annotate-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'text-annotate-styles';
    style.textContent = `
${getReadingModeStyles()}
/* Reading Mode container base to ensure viewport-scoped scrolling */
#text-annotate-reading-mode {
  background: var(--rm-bg, #ffffff);
  color: var(--rm-fg, #111111);
}
#text-annotate-reading-mode.rm-theme-light { --rm-bg:#ffffff; --rm-fg:#111111; }
#text-annotate-reading-mode.rm-theme-dark { --rm-bg:#0b0d10; --rm-fg:#e6e8ea; }
#text-annotate-reading-mode.rm-theme-sepia { --rm-bg:#f4ecd8; --rm-fg:#403323; }
/* Force theme colors onto content text overriding default white */
#text-annotate-reading-mode .text-annotate-content,
#text-annotate-reading-mode .text-annotate-plain-text {
  color: var(--rm-fg, #111111) !important;
}
/* Header inherits background but ensure text uses theme fg */
#text-annotate-reading-mode .text-annotate-header,
#text-annotate-reading-mode .text-annotate-title {
  color: var(--rm-fg, #111111);
  background: inherit;
}
.text-annotate-header { position: sticky; top: 0; z-index: 1; background: inherit; }
/* Icon button styling matching popup */
#text-annotate-reading-mode .ta-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 30px; width: 34px; border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.15); background: rgba(255,255,255,0.9);
  color: #374151; transition: transform 0.12s ease, background-color 0.2s ease;
}
#text-annotate-reading-mode.rm-theme-dark .ta-icon-btn {
  border-color: rgba(255,255,255,0.2); background: rgba(31,41,55,0.9); color: #e5e7eb;
}
#text-annotate-reading-mode .ta-icon-btn:hover { transform: scale(1.06); }
#text-annotate-reading-mode .ta-icon-btn:active { transform: scale(0.97); }
#text-annotate-reading-mode .ta-icon { height: 16px; width: 16px; display: inline-block; }
#text-annotate-reading-mode .ta-icon svg { height: 16px; width: 16px; display: block; }
`;
    document.head.appendChild(style);
  }

  // ——— Settings, Shortcuts, and Scroll Lock ———
  private applySettingsToContainer(): void {
    if (!this.container) return;
    // Theme class
    this.container.classList.remove('rm-theme-light', 'rm-theme-dark', 'rm-theme-sepia');
    this.container.classList.add(`rm-theme-${this.settings.theme}`);
    // Apply to content area if exists
    if (this.contentArea) {
      (this.contentArea as HTMLElement).style.maxWidth = `${this.settings.maxWidthCh}ch`;
      (this.contentArea as HTMLElement).style.fontSize = `${this.settings.fontSizePx}px`;
      (this.contentArea as HTMLElement).style.lineHeight = String(this.settings.lineHeight);
    }
    const plain = this.container.querySelector('.text-annotate-plain-text') as HTMLElement | null;
    if (plain) {
      plain.style.fontSize = `${this.settings.fontSizePx}px`;
      plain.style.lineHeight = String(this.settings.lineHeight);
    }
  }

  private adjustFontSize(deltaPx: number): void {
    const next = Math.min(32, Math.max(12, this.settings.fontSizePx + deltaPx));
    this.settings.fontSizePx = next;
    this.applySettingsToContainer();
    this.saveSettings().catch(() => {});
  }

  private adjustLineHeight(delta: number): void {
    const next = Math.min(2.0, Math.max(1.2, parseFloat((this.settings.lineHeight + delta).toFixed(2))));
    this.settings.lineHeight = next;
    this.applySettingsToContainer();
    this.saveSettings().catch(() => {});
  }

  private adjustMaxWidth(deltaCh: number): void {
    const next = Math.min(90, Math.max(40, this.settings.maxWidthCh + deltaCh));
    this.settings.maxWidthCh = next;
    this.applySettingsToContainer();
    this.saveSettings().catch(() => {});
  }

  private cycleTheme(): void {
    const order: Array<'light' | 'dark' | 'sepia'> = ['light', 'dark', 'sepia'];
    const idx = order.indexOf(this.settings.theme);
    this.settings.theme = order[(idx + 1) % order.length];
    this.applySettingsToContainer();
    this.saveSettings().catch(() => {});
  }

  private async loadSettings(): Promise<void> {
    try {
      const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
      if (hasChrome) {
        const data = await new Promise<Record<string, unknown>>(resolve => {
          try {
            chrome.storage.local.get([this.settingsKey], res => resolve(res || {}));
          } catch {
            resolve({});
          }
        });
        const raw = (data && (data[this.settingsKey] as any)) || null;
        if (raw && typeof raw === 'object') {
          this.settings.fontSizePx = Math.max(12, Math.min(32, Number((raw as any).fontSizePx) || this.settings.fontSizePx));
          this.settings.lineHeight = Math.max(1.2, Math.min(2.0, Number((raw as any).lineHeight) || this.settings.lineHeight));
          this.settings.maxWidthCh = Math.max(40, Math.min(90, Number((raw as any).maxWidthCh) || this.settings.maxWidthCh));
          const theme = (raw as any).theme;
          if (theme === 'light' || theme === 'dark' || theme === 'sepia') this.settings.theme = theme;
        }
        return;
      }
      // Fallback to localStorage (site-scoped)
      const raw = localStorage.getItem(this.settingsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.settings = { ...this.settings, ...parsed };
        }
      }
    } catch {
      // ignore
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const payload = { [this.settingsKey]: this.settings } as Record<string, unknown>;
      const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
      if (hasChrome) {
        await new Promise<void>(resolve => {
          try {
            chrome.storage.local.set(payload, () => resolve());
          } catch {
            resolve();
          }
        });
        return;
      }
      localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  private lockScroll(): void {
    if (this.isScrollLocked) return;
    this.isScrollLocked = true;
    this.lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.style.overflow = 'hidden';
    (document.documentElement.style as any).overscrollBehaviorY = 'contain';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  private unlockScroll(): void {
    if (!this.isScrollLocked) return;
    this.isScrollLocked = false;
    const restoreY = -parseInt(document.body.style.top || '0', 10) || 0;
    document.documentElement.style.overflow = '';
    (document.documentElement.style as any).overscrollBehaviorY = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, restoreY);
  }
}
