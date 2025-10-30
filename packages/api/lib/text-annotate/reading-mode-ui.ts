/**
 * Reading mode UI manager
 * Creates and manages the reading mode interface
 */

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
  private phaseTimes: Partial<Record<'extract' | 'detect' | 'segment' | 'prechunk' | 'translate' | 'finalize', number>> = {};

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
    metrics?: { literalCount?: number; contextualCount?: number; literalTimeMs?: number; contextualTimeMs?: number; batchTimeMs?: number },
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
    const {
      phase,
      completed,
      total,
      literalCount,
      contextualCount,
      literalTimeMs,
      contextualTimeMs,
      batchTimeMs,
      posTimeMs,
      phaseTimes,
    } = data as any;

    if (phaseTimes && typeof phaseTimes === 'object') {
      this.phaseTimes = { ...this.phaseTimes, ...phaseTimes };
    }
    const phasesOrder: Array<keyof typeof this.phaseTimes> = ['extract', 'detect', 'segment', 'prechunk', 'translate', 'finalize'];
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

    // Show tooltip on hover
    span.addEventListener('mouseenter', () => {
      tooltip.style.display = 'block';
    });

    span.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

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

    if (chunk.translation.differs) {
      // Show both translations when they differ
      const literalDiv = document.createElement('div');
      literalDiv.className = 'text-annotate-tooltip-literal';
      literalDiv.textContent = `Literal: ${chunk.translation.literal}`;
      tooltip.appendChild(literalDiv);

      const contextualDiv = document.createElement('div');
      contextualDiv.className = 'text-annotate-tooltip-contextual';
      contextualDiv.textContent = `Contextual: ${chunk.translation.contextual}`;
      tooltip.appendChild(contextualDiv);
    } else {
      // Show single translation
      const translationDiv = document.createElement('div');
      translationDiv.className = 'text-annotate-tooltip-translation';
      translationDiv.textContent = chunk.translation.contextual || chunk.translation.literal;
      tooltip.appendChild(translationDiv);
    }

    return tooltip;
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
