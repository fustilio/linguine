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
    this.loadConfig().then(() => {
      this.applyConfigToOpenTooltips();
    });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.hide();
    } else if (e.key === 'Tab' && this.container && this.container.style.display !== 'none') {
      e.preventDefault();
      this.toggleDebugPanel();
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

    // Create header with progress bar
    const header = this.createHeaderWithProgress(title, onClose);
    this.container.appendChild(header);

    // Create content area with plain text
    this.contentArea = this.createPlainTextContent(plainText);
    this.container.appendChild(this.contentArea);
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
  }

  /**
   * Show reading mode
   */
  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
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
  }

  /**
   * Create container element
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'text-annotate-reading-mode';
    container.className = 'text-annotate-reading-mode';
    container.style.display = 'none';
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

    // Controls row: toggles for images, prefixes, and source
    const controls = document.createElement('div');
    controls.className = 'text-annotate-controls';
    controls.style.display = 'flex';
    controls.style.gap = '12px';
    controls.style.alignItems = 'center';
    controls.style.justifyContent = 'center';
    controls.style.marginTop = '4px';

    // Icon button helper
    const makeIconButton = (label: string, title: string): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.title = title;
      btn.style.border = '1px solid #e5e7eb';
      btn.style.background = '#fff';
      btn.style.borderRadius = '6px';
      btn.style.padding = '2px 6px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '12px';
      return btn;
    };

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

    const textEl = document.createElement('div');
    textEl.className = 'text-annotate-plain-text';

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
    style.textContent = getReadingModeStyles();
    document.head.appendChild(style);
  }
}
