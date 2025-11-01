/// <reference types="dom-chromium-ai" />

// Word Replacer Content Script
// This script runs on every webpage and handles both word replacement and selection
// Users can select text to add replacements and see replacements applied in real-time

import { rewriterManager } from './chrome-ai/index.js';
import {
  expandSelectionToWordBoundaries as expandSelectionToWordBoundariesUtil,
  findSentenceStart as findSentenceStartUtil,
  findSentenceEnd as findSentenceEndUtil,
  preserveOriginalFormatting as preserveOriginalFormattingUtil,
  cleanupEmptyInlineElements as cleanupEmptyInlineElementsUtil,
  cleanupStrayMarkersInDoc as cleanupStrayMarkersInDocUtil,
} from './dom-utils.js';
import { buildRewriterOptions as rwBuildOptions, toBaseLang as rwToBaseLang } from './rewriter-options.js';
import { detectLanguageFromText } from './text-annotate/language-detector.js';
import { generateFragmentStringHashFromRange } from './text-fragments-api.js';
import { addTextRewrite } from './text-rewrites-api.js';
import { undoManager } from './undo-manager.js';
import { normalizeLanguageCode } from '@extension/shared';
import { DEFAULT_REWRITER_PROMPT, wordReplacerStorage, languageStorage } from '@extension/storage';

type WidgetSize = 'small' | 'medium' | 'large';

type WordReplacerStorageRewriterOptions = {
  sharedContext: string;
  tone: string;
  format: string;
  length: string;
  expectedInputLanguages: string[];
  expectedContextLanguages: string[];
  outputLanguage: string;
};

export class WordReplacer {
  private static instance: WordReplacer | null = null;
  private replacements: Map<string, string>;
  private isActive: boolean;
  private highlightColor: string;
  private observer: MutationObserver | null;
  private selectedWords: Set<string>;
  private currentHighlight: HTMLElement | null;
  private rewriterOptions: Partial<RewriterCreateOptions>;
  private widgetSize: WidgetSize;
  private downloadProgress: number;
  private isDownloading: boolean;
  private replaceTimeout?: ReturnType<typeof setTimeout>;
  private handleSelection?: ((event: MouseEvent) => void) | null;
  private interactiveWrappers: Set<HTMLElement>;

  private constructor() {
    this.replacements = new Map();
    this.isActive = false;
    this.highlightColor = '#fbbf24';
    this.observer = null;
    this.selectedWords = new Set();
    this.currentHighlight = null; // Track the currently highlighted element

    // Rewriter API state
    this.rewriterOptions = {
      sharedContext: 'Use simpler vocabulary so I can understand this text.',
      tone: 'as-is',
      format: 'as-is',
      length: 'shorter',
      expectedInputLanguages: ['en'],
      expectedContextLanguages: ['en'],
      outputLanguage: 'ja',
    };
    this.widgetSize = 'small';
    this.downloadProgress = 0;
    this.isDownloading = false;

    this.interactiveWrappers = new Set();

    // Initialize the extension
    this.init();
  }

  public static getInstance(): WordReplacer {
    if (!WordReplacer.instance) {
      WordReplacer.instance = new WordReplacer();
    }
    return WordReplacer.instance;
  }

  public static resetInstance(): void {
    if (WordReplacer.instance) {
      WordReplacer.instance.cleanup();
      WordReplacer.instance = null;
    }
  }

  private cleanup(): void {
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Clear timeouts
    if (this.replaceTimeout) {
      clearTimeout(this.replaceTimeout);
      this.replaceTimeout = undefined;
    }

    // Remove event listeners
    if (this.handleSelection) {
      document.removeEventListener('mouseup', this.handleSelection);
      this.handleSelection = null;
    }

    // Clear selections
    this.selectedWords.clear();
    this.currentHighlight = null;
  }

  async init() {
    // Load settings from storage
    await this.loadSettings();

    // Set up mutation observer for dynamic content
    this.setupMutationObserver();

    // Set up or remove selection mode based on active state
    if (this.isActive) {
      this.setupSelectionMode();
    } else {
      this.removeSelectionMode(); // Ensure it's cleaned up if inactive
    }

    // Initial replacement if active
    // if (this.isActive) {
    //   this.replaceWordsInPage();
    // }
  }

  async loadSettings() {
    try {
      const storageState = await wordReplacerStorage.get();

      this.isActive = storageState?.isActive ?? false;
      this.widgetSize = storageState?.widgetSize ?? 'small';

      // Load rewriter options from storage; keep defaults consistent with storage package
      this.rewriterOptions = {
        sharedContext: storageState?.rewriterOptions?.sharedContext ?? DEFAULT_REWRITER_PROMPT,
        tone: (storageState?.rewriterOptions?.tone as unknown as RewriterTone) ?? ('as-is' as unknown as RewriterTone),
        format:
          (storageState?.rewriterOptions?.format as unknown as RewriterFormat) ??
          ('as-is' as unknown as RewriterFormat),
        length:
          (storageState?.rewriterOptions?.length as unknown as RewriterLength) ??
          ('shorter' as unknown as RewriterLength),
        expectedInputLanguages: storageState?.rewriterOptions?.expectedInputLanguages ?? ['en'],
        expectedContextLanguages: storageState?.rewriterOptions?.expectedContextLanguages ?? ['en'],
        outputLanguage: storageState?.rewriterOptions?.outputLanguage ?? 'en',
      };

      // Non-persisted fields (kept local for now)
      this.highlightColor = '#fbbf24';

      console.log('Word Replacer: Settings loaded (storage)', {
        isActive: this.isActive,
        replacements: this.replacements.size,
        rewriterOptions: this.rewriterOptions,
      });
    } catch (error) {
      console.error('Word Replacer: Error loading settings', error);
    }
  }

  async saveSettings() {
    try {
      await wordReplacerStorage.set(current => ({
        ...current,
        isActive: this.isActive,
        widgetSize: this.widgetSize,
        rewriterOptions: {
          ...current.rewriterOptions,
          sharedContext: this.rewriterOptions.sharedContext ?? current.rewriterOptions.sharedContext,
          tone: (this.rewriterOptions.tone as string | undefined) ?? current.rewriterOptions.tone,
          format: (this.rewriterOptions.format as string | undefined) ?? current.rewriterOptions.format,
          length: (this.rewriterOptions.length as string | undefined) ?? current.rewriterOptions.length,
          expectedInputLanguages:
            this.rewriterOptions.expectedInputLanguages?.slice() ?? current.rewriterOptions.expectedInputLanguages,
          expectedContextLanguages:
            this.rewriterOptions.expectedContextLanguages?.slice() ?? current.rewriterOptions.expectedContextLanguages,
          outputLanguage: this.rewriterOptions.outputLanguage ?? current.rewriterOptions.outputLanguage,
        },
      }));
    } catch (error) {
      console.error('Word Replacer: Error saving settings', error);
    }
  }

  /**
   * Update WordReplacer state (isActive, widgetSize, rewriterOptions)
   */
  async updateState(state: {
    isActive?: boolean;
    widgetSize?: 'small' | 'medium' | 'large';
    rewriterOptions?: RewriterRewriteOptions;
  }): Promise<void> {
    const wasActive = this.isActive;

    // Update state and persist via storage
    if (state.isActive !== undefined) {
      this.isActive = state.isActive;
      await wordReplacerStorage.updateState({ isActive: this.isActive });
    }
    if (state.widgetSize) {
      this.widgetSize = state.widgetSize;
      await wordReplacerStorage.updateState({ widgetSize: this.widgetSize });
    }
    if (state.rewriterOptions) {
      this.rewriterOptions = { ...this.rewriterOptions, ...state.rewriterOptions };
      await wordReplacerStorage.updateRewriterOptions(
        state.rewriterOptions as Partial<WordReplacerStorageRewriterOptions>,
      );
      try {
        await rewriterManager.getRewriter(rwBuildOptions(this.rewriterOptions));
      } catch (error) {
        console.warn('Failed to reinitialize rewriter with new options:', error);
      }
    }

    // Handle activation/deactivation
    if (this.isActive && !wasActive) {
      this.setupSelectionMode();
      this.replaceWordsInPage();
    } else if (!this.isActive && wasActive) {
      this.removeHighlights();
      this.removeCurrentHighlight();
      this.removeSelectionMode();
    }

    this.saveSettings();
  }

  /**
   * Add a replacement mapping
   */
  async addReplacement(original: string, replacement: string): Promise<void> {
    this.replacements.set(original, replacement);
    this.saveSettings();
    if (this.isActive) {
      this.replaceWordsInPage();
    }
  }

  /**
   * Remove a replacement mapping
   */
  async removeReplacement(original: string): Promise<void> {
    this.replacements.delete(original);
    this.saveSettings();
    if (this.isActive) {
      this.replaceWordsInPage();
    }
  }

  /**
   * Get current WordReplacer state
   */
  getState(): {
    isActive: boolean;
    replacements: Array<[string, string]>;
    highlightColor: string;
  } {
    return {
      isActive: this.isActive,
      replacements: Array.from(this.replacements.entries()),
      highlightColor: this.highlightColor,
    };
  }

  /**
   * Update rewriter options
   */
  async updateRewriterOptions(options: Partial<RewriterCreateOptions>): Promise<void> {
    this.rewriterOptions = {
      ...this.rewriterOptions,
      ...options,
    };
    await wordReplacerStorage.updateRewriterOptions(options as Partial<WordReplacerStorageRewriterOptions>);

    try {
      await rewriterManager.getRewriter(rwBuildOptions(this.rewriterOptions));
    } catch (error) {
      console.warn('Failed to reinitialize rewriter with new options:', error);
    }

    this.saveSettings();
  }

  /**
   * Check if there are any active rewrites on the current page
   */
  hasActiveRewrites(): boolean {
    return undoManager.hasActiveRewrites();
  }

  /**
   * Undo all interactive rewrites on the page, restoring original text
   */
  undoAllRewrites() {
    console.log('[WordReplacer] undoAllRewrites called');
    const stats = undoManager.undoAll();
    console.log('[WordReplacer] undoAllRewrites completed', stats);
    return stats;
  }

  setupMutationObserver() {
    // Disconnect existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    // Create new observer
    this.observer = new MutationObserver(mutations => {
      let shouldReplace = false;

      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any text nodes were added
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.textContent)) {
              shouldReplace = true;
            }
          });
        }
      });

      if (shouldReplace && this.isActive) {
        // Debounce the replacement to avoid excessive calls
        clearTimeout(this.replaceTimeout);
        this.replaceTimeout = setTimeout(() => {
          this.replaceWordsInPage();
        }, 100);
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  setupSelectionMode() {
    // Only set up if active
    if (!this.isActive) {
      return;
    }

    // Remove existing event listener first
    this.removeSelectionMode();

    // Create and store the handler
    this.handleSelection = () => {
      // Double-check isActive before proceeding
      if (!this.isActive) {
        return;
      }

      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';

      if (selectedText && selectedText.length > 0) {
        // this.highlightSelectedWord(selectedText, selection);
      }
    };

    document.addEventListener('mouseup', this.handleSelection);
  }

  removeSelectionMode() {
    if (this.handleSelection) {
      document.removeEventListener('mouseup', this.handleSelection);
      this.handleSelection = null;
    }
  }

  async highlightSelectedWord(word: string, selection: Selection | null): Promise<void> {
    if (!this.isActive || !selection) {
      return;
    }

    // Remove previous highlight if it exists
    if (this.currentHighlight) {
      this.removeCurrentHighlight();
    }

    // Expand selection to complete word boundaries
    const range = expandSelectionToWordBoundariesUtil(selection.getRangeAt(0));
    const expandedWord = range.toString().trim();

    // Use the expanded word if it's different from the original selection
    const finalWord = expandedWord || word;

    // Create a highlight span
    const span = document.createElement('span');
    span.className = 'word-replacer-highlight';
    span.style.backgroundColor = this.highlightColor;
    span.style.padding = '2px 4px';
    span.style.borderRadius = '3px';
    span.style.cursor = 'pointer';
    span.style.position = 'relative';
    span.style.display = 'inline';
    span.title = `Click to rewrite "${finalWord}" with AI`;

    // Store reference to current highlight
    this.currentHighlight = span;

    // Add click event to trigger AI rewriting
    span.addEventListener('click', async () => {
      await this.rewriteHighlightedText(finalWord, span);
    });

    try {
      range.surroundContents(span);
      selection.removeAllRanges();
    } catch {
      // If surroundContents fails, try extractContents and appendChild
      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      } catch (e) {
        console.warn('Word Replacer: Could not highlight selection', e);
        // Reset current highlight reference if highlighting failed
        this.currentHighlight = null;
      }
    }
  }

  /**
   * Clean up the rewritten response by removing any unwanted formatting or context
   */
  private cleanRewrittenResponse(rawResponse: string): string {
    let cleanedResponse = rawResponse.trim();

    // Remove common response patterns that include context
    cleanedResponse = cleanedResponse
      .replace(/^context:\s*/gi, '')
      .replace(/^rewrite.*?:\s*/gi, '')
      .replace(/^original.*?:\s*/gi, '')
      .replace(/^replacement:\s*/gi, '')
      .replace(/^answer:\s*/gi, '')
      .replace(/^result:\s*/gi, '')
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^\[.*?\]\s*/g, '') // Remove bracketed prefixes like [TARGET]
      .replace(/\[TARGET\]/gi, '') // Remove any remaining [TARGET] markers
      .replace(/\.\.\./g, '') // Remove ellipsis that might indicate context
      .trim();

    // Remove any sentences that seem to include the original context
    // Split by periods and take the shortest meaningful phrase
    const sentences = cleanedResponse
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length > 1) {
      // If multiple sentences, prefer the shortest one (likely the replacement)
      const shortestSentence = sentences.reduce((shortest, current) =>
        current.length < shortest.length ? current : shortest,
      );
      if (shortestSentence.length > 0) {
        cleanedResponse = shortestSentence;
      }
    }

    // If the response has multiple lines, prefer the first non-empty line
    const lines = cleanedResponse
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (lines.length > 0) {
      return lines[0];
    }

    return cleanedResponse;
  }

  /**
   * Extract surrounding context from within the same sentence
   */
  private extractSurroundingContext(
    element: HTMLElement,
    targetText: string,
    contextLength: number = 100,
  ): {
    beforeContext: string;
    afterContext: string;
    fullContext: string;
  } {
    try {
      // Get the parent container that likely contains the sentence
      let contextContainer = element.parentElement;
      while (
        contextContainer &&
        contextContainer.textContent &&
        contextContainer.textContent.length < targetText.length + contextLength * 2
      ) {
        contextContainer = contextContainer.parentElement;
        // Stop if we've gone too far up (like body or html)
        if (!contextContainer || ['BODY', 'HTML', 'MAIN', 'ARTICLE'].includes(contextContainer.tagName)) {
          break;
        }
      }

      if (!contextContainer || !contextContainer.textContent) {
        return { beforeContext: '', afterContext: '', fullContext: targetText };
      }

      const fullText = contextContainer.textContent;
      const targetIndex = fullText.indexOf(targetText);

      if (targetIndex === -1) {
        return { beforeContext: '', afterContext: '', fullContext: targetText };
      }

      // Find sentence boundaries around the target text
      const sentenceEnd = findSentenceEndUtil(fullText, targetIndex + targetText.length);
      const sentenceStart = findSentenceStartUtil(fullText, targetIndex);

      // Extract context within the same sentence
      const beforeContext = fullText.substring(sentenceStart, targetIndex).trim();
      const afterContext = fullText.substring(targetIndex + targetText.length, sentenceEnd).trim();
      const fullContext = fullText.substring(sentenceStart, sentenceEnd).trim();

      return { beforeContext, afterContext, fullContext };
    } catch (error) {
      console.warn('Error extracting context:', error);
      return { beforeContext: '', afterContext: '', fullContext: targetText };
    }
  }

  /**
   * Rewrite highlighted text using AI and create interactive UI
   */
  async rewriteHighlightedText(originalText: string, highlightSpan: HTMLElement): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ Extension is not active, rewriting disabled');
      return;
    }

    try {
      // Show loading state
      highlightSpan.style.backgroundColor = '#fbbf24';
      highlightSpan.title = 'Rewriting with AI...';

      // Extract surrounding context for better rewriting
      const contextInfo = this.extractSurroundingContext(highlightSpan, originalText);

      // Determine languages for this rewrite
      const detectedLang = await detectLanguageFromText(contextInfo.fullContext || originalText);
      const detectedBase = rwToBaseLang(normalizeLanguageCode(detectedLang || 'en-US'));
      const nativeState = await languageStorage.get();
      const nativeBase = rwToBaseLang(nativeState?.nativeLanguage || 'en-US');

      // Initialize rewriter with per-call language settings
      const rewriter = await rewriterManager.getRewriter(
        rwBuildOptions(this.rewriterOptions, detectedBase, nativeBase),
      );

      if (!rewriter) {
        throw new Error('Failed to initialize rewriter');
      }

      // Prepare context-aware prompt
      const rewritePrompt = originalText;
      let contextPrompt = 'Make this text easier to understand for language learners.';

      if (contextInfo.beforeContext || contextInfo.afterContext) {
        contextPrompt = `CONTEXT: "${contextInfo.beforeContext} [TARGET] ${contextInfo.afterContext}"

INSTRUCTIONS: 
- You will rewrite ONLY the word(s) marked as [TARGET] 
- The [TARGET] text is: "${originalText}"
- Make it easier to understand for language learners
- Your response should contain ONLY the replacement text, nothing else
- Do NOT include the surrounding context in your response
- Do NOT repeat the original text
- Do NOT provide explanations

EXAMPLE:
If context is "The cat [TARGET] quickly" and target is "ran", respond with just: "moved fast"`;
      }

      // Rewrite the text
      const rawRewrittenText = await rewriter.rewrite(rewritePrompt, {
        context: contextPrompt,
      });

      // Clean up the rewritten response
      let rewrittenText = this.cleanRewrittenResponse(rawRewrittenText);

      // Preserve original formatting patterns
      rewrittenText = preserveOriginalFormattingUtil(originalText, rewrittenText);

      // Create wrapper for the rewritten content
      const wrapper = document.createElement('span');
      wrapper.className = 'rewriter-highlight';
      wrapper.style.cssText = `
            background-color: #e5e7eb;
            padding: 2px 4px;
            border-radius: 3px;
            position: relative;
            display: inline;
          `;

      // Store both texts as data attributes
      wrapper.dataset.originalText = originalText;
      wrapper.dataset.rewrittenText = rewrittenText;
      wrapper.textContent = rewrittenText;

      // Create button container
      const buttonContainer = document.createElement('span');
      buttonContainer.className = 'rewriter-buttons';
      buttonContainer.style.cssText = `
            display: inline-flex;
            gap: 4px;
            margin-left: 6px;
            vertical-align: middle;
          `;

      // Create button styles
      const buttonStyle = `
            padding: 2px 6px;
            font-size: 11px;
            border: 1px solid #d1d5db;
            border-radius: 3px;
            cursor: pointer;
            background: white;
            color: #374151;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: all 0.15s;
          `;

      // Toggle button (switch between original and rewritten)
      let showingRewritten = true;
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button'; // Prevent form submission
      toggleBtn.textContent = '⇄';
      toggleBtn.title = 'Toggle between original and rewritten';
      toggleBtn.style.cssText =
        buttonStyle +
        `
            color: #2563eb;
            border-color: #93c5fd;
          `;

      toggleBtn.addEventListener('mouseover', () => {
        toggleBtn.style.backgroundColor = '#dbeafe';
      });
      toggleBtn.addEventListener('mouseout', () => {
        toggleBtn.style.backgroundColor = 'white';
      });
      toggleBtn.addEventListener('click', e => {
        try {
          e.preventDefault();
          e.stopPropagation();

          console.log('🔄 Toggle button clicked, currently showing:', showingRewritten ? 'rewritten' : 'original');

          if (showingRewritten) {
            wrapper.textContent = originalText;
            wrapper.style.backgroundColor = '#fef3c7';
            toggleBtn.title = 'Showing original - click to see rewritten';
            showingRewritten = false;
            console.log('✅ Switched to original text');
          } else {
            wrapper.textContent = rewrittenText;
            wrapper.style.backgroundColor = '#e5e7eb';
            toggleBtn.title = 'Showing rewritten - click to see original';
            showingRewritten = true;
            console.log('✅ Switched to rewritten text');
          }
        } catch (error) {
          console.error('❌ Error in toggle button:', error);
        }
      });

      // Apply button
      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.textContent = '✓';
      applyBtn.title = 'Apply current version';
      applyBtn.style.cssText =
        buttonStyle +
        `
            color: #16a34a;
            border-color: #86efac;
          `;

      applyBtn.addEventListener('mouseover', () => {
        applyBtn.style.backgroundColor = '#dcfce7';
      });
      applyBtn.addEventListener('mouseout', () => {
        applyBtn.style.backgroundColor = 'white';
      });
      applyBtn.addEventListener('click', e => {
        try {
          e.preventDefault();
          e.stopPropagation();

          // Remove buttons and keep the current text
          if (buttonContainer && buttonContainer.parentNode) {
            buttonContainer.remove();
          }
          wrapper.style.backgroundColor = 'transparent';
          wrapper.style.padding = '0';
          wrapper.classList.remove('rewriter-highlight');

          // Clear current highlight reference
          if (this.currentHighlight === wrapper) {
            this.currentHighlight = null;
          }
        } catch (error) {
          console.error('❌ Error in apply button:', error);
        }
      });

      // Save button (add to replacements)
      // const saveBtn = document.createElement('button');
      // saveBtn.textContent = '💾';
      // saveBtn.title = 'Save as permanent replacement';
      // saveBtn.style.cssText =
      //   buttonStyle +
      //   `
      //     color: #7c3aed;
      //     border-color: #c4b5fd;
      //   `;

      // saveBtn.addEventListener('mouseover', () => {
      //   saveBtn.style.backgroundColor = '#f3f4f6';
      // });
      // saveBtn.addEventListener('mouseout', () => {
      //   saveBtn.style.backgroundColor = 'white';
      // });
      // saveBtn.addEventListener('click', () => {
      //   const currentText = showingRewritten ? rewrittenText : originalText;
      //   this.replacements.set(originalText, currentText);
      //   this.saveSettings();

      //   // Apply replacements to the whole page
      //   this.replaceWordsInPage();

      //   // Remove the interactive UI
      //   buttonContainer.remove();
      //   wrapper.style.backgroundColor = 'transparent';
      //   wrapper.style.padding = '0';
      //   wrapper.classList.remove('rewriter-highlight');

      //   // Send message to popup to update UI
      //   chrome.runtime.sendMessage({
      //     action: 'wordSelected',
      //     original: originalText,
      //     replacement: currentText,
      //   });

      //   // Clear current highlight reference
      //   if (this.currentHighlight === highlightSpan) {
      //     this.currentHighlight = null;
      //   }
      // });

      // Assemble buttons
      buttonContainer.appendChild(toggleBtn);
      buttonContainer.appendChild(applyBtn);
      // buttonContainer.appendChild(saveBtn);

      // Replace the highlight span with the new interactive content
      const parent = highlightSpan.parentNode;
      if (parent) {
        parent.insertBefore(wrapper, highlightSpan);
        parent.insertBefore(buttonContainer, highlightSpan);
        parent.removeChild(highlightSpan);

        // Update current highlight reference
        this.currentHighlight = wrapper;
        // Track for undo
        undoManager.registerWrapper(wrapper);
      }
    } catch (error: unknown) {
      console.error('❌ Error rewriting highlighted text:', error);

      // Reset highlight on error
      highlightSpan.style.backgroundColor = '#ef4444';
      highlightSpan.title = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      // Reset after 3 seconds
      setTimeout(() => {
        if (highlightSpan.parentNode) {
          this.removeCurrentHighlight();
        }
      }, 3000);
    }
  }

  removeCurrentHighlight() {
    if (this.currentHighlight && this.currentHighlight.parentNode) {
      const parent = this.currentHighlight.parentNode;
      const textContent = this.currentHighlight.textContent;

      // Replace the highlight span with its text content
      parent.replaceChild(document.createTextNode(textContent), this.currentHighlight);
      parent.normalize();

      // Clear the reference
      undoManager.unregisterWrapper(this.currentHighlight);
      this.currentHighlight = null;
    }
  }

  replaceWordsInPage() {
    if (!this.isActive || this.replacements.size === 0) {
      return;
    }

    // Get all text nodes in the document
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        // Skip script, style, and other non-visible elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip already processed nodes
        if (parent.classList.contains('word-replacer-processed')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    let node;

    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    // Process each text node
    textNodes.forEach(textNode => {
      let text = textNode.textContent;
      if (!text) {
        return;
      }
      let modified = false;

      // Apply all replacements
      for (const [original, replacement] of this.replacements) {
        // Use word boundaries to avoid partial word replacements
        const regex = new RegExp(`\\b${this.escapeRegex(original)}\\b`, 'gi');
        if (regex.test(text)) {
          text = text.replace(regex, replacement);
          modified = true;
        }
      }

      // Update the text if modified
      if (modified) {
        textNode.textContent = text;
        // Mark parent as processed to avoid re-processing
        if (textNode.parentElement) {
          textNode.parentElement.classList.add('word-replacer-processed');
        }
      }
    });
  }

  escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  removeHighlights() {
    // Remove interactive wrappers via manager
    try {
      undoManager.removeAllInteractiveKeepCurrent();
    } catch (e) {
      console.warn('Word Replacer: removeAllInteractiveKeepCurrent failed, falling back', e);
      const wrappers = document.querySelectorAll('.rewriter-highlight');
      wrappers.forEach(node => {
        const wrapper = node as HTMLElement;
        const buttons = wrapper.nextElementSibling;
        if (buttons && buttons.classList.contains('rewriter-buttons')) {
          buttons.remove();
        }
        const parent = wrapper.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(wrapper.textContent || ''), wrapper);
          (parent as HTMLElement).normalize();
        }
      });
    }

    // Remove current highlight reference
    this.currentHighlight = null;

    // Remove all word replacer highlights (legacy)
    const highlights = document.querySelectorAll('.word-replacer-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
  }

  /**
   * Check if Rewriter API is available
   */
  async checkRewriterAvailability() {
    try {
      const windowWithAI = window as typeof window & { Rewriter?: typeof Rewriter };
      if (!windowWithAI.Rewriter) {
        return {
          available: false,
          error: 'Rewriter API not found in browser',
        };
      }

      const availability = await windowWithAI.Rewriter.availability();
      return {
        available: true,
        status: availability,
        message: `Rewriter API is ${availability}`,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Initialize Rewriter API with configuration options
   */
  async initRewriter() {
    try {
      return await rewriterManager.getRewriter(rwBuildOptions(this.rewriterOptions));
    } catch (error) {
      console.error('Failed to initialize Rewriter:', error);
      throw error;
    }
  }

  /**
   * Reinitialize the rewriter singleton with current options
   * This is called when settings are updated from the popup
   */
  async reinitializeRewriter(): Promise<void> {
    try {
      await rewriterManager.getRewriter(rwBuildOptions(this.rewriterOptions));
    } catch (error) {
      console.error('Failed to reinitialize Rewriter:', error);
      throw error;
    }
  }

  /**
   * Get current rewriter options for debugging
   */
  getRewriterOptions(): Partial<RewriterCreateOptions> {
    return { ...this.rewriterOptions };
  }

  /**
   * Replace selected text in the DOM while preserving position, font, and style
   */
  replaceSelectedTextInDOM(range: Range, newText: string): void {
    // Get all text nodes within the selection
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Case 1: Selection is within a single text node (most common case)
    const isSingleTextNode = startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE;

    // Check if this is a selection that ends at the boundary of the next element
    const isSelectionToElementBoundary =
      startContainer.nodeType === Node.TEXT_NODE &&
      endContainer.nodeType === Node.ELEMENT_NODE &&
      range.endOffset === 0 &&
      range.startOffset === 0;

    if (isSingleTextNode || isSelectionToElementBoundary) {
      const textNode = startContainer as Text;
      const originalText = textNode.nodeValue || '';

      // Replace just the selected portion by modifying nodeValue directly
      const before = originalText.substring(0, range.startOffset);
      const after = isSelectionToElementBoundary ? '' : originalText.substring(range.endOffset);
      textNode.nodeValue = before + newText + after;

      // Clear the selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      return;
    }

    // Case 2: Selection spans multiple nodes

    // Check if we're selecting from the very start of one element
    const isSelectingFromStart = range.startOffset === 0;

    if (isSelectingFromStart) {
      // User selected entire paragraphs - create a new paragraph element

      // Find the parent paragraph element
      let firstP =
        startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : (startContainer as HTMLElement);

      // Find the actual <p> element if we're in a nested structure
      while (firstP && firstP.nodeName !== 'P') {
        firstP = firstP.parentElement;
      }

      if (firstP) {
        // Collect all paragraph elements that are fully or partially selected
        const paragraphsToRemove: Element[] = [];

        // Start from the first paragraph and find all selected paragraphs
        let currentNode: Node | null = firstP;

        while (currentNode) {
          if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.nodeName === 'P') {
            if (range.intersectsNode(currentNode)) {
              paragraphsToRemove.push(currentNode as Element);
            } else {
              break;
            }
          }
          currentNode = currentNode.nextSibling;
        }

        // Replace the FIRST selected paragraph's content, remove the rest
        if (paragraphsToRemove.length > 0) {
          const firstSelectedP = paragraphsToRemove[0] as HTMLElement;
          firstSelectedP.textContent = newText;

          // Remove the additional paragraphs (skip the first one)
          for (let i = 1; i < paragraphsToRemove.length; i++) {
            paragraphsToRemove[i].remove();
          }
        }
      } else {
        // Fallback: create a div
        const newDiv = document.createElement('div');
        newDiv.textContent = newText;
        range.deleteContents();
        range.insertNode(newDiv);
      }
    } else {
      // Partial selection - need to check if it spans multiple paragraphs
      let targetTextNode: Text | null = null;

      if (startContainer.nodeType === Node.TEXT_NODE) {
        targetTextNode = startContainer as Text;
      } else {
        // Find first text node in start container
        const walker = document.createTreeWalker(startContainer, NodeFilter.SHOW_TEXT, null);
        targetTextNode = walker.nextNode() as Text;
      }

      if (targetTextNode) {
        // Find if selection spans multiple paragraphs
        const startP = targetTextNode.parentElement?.closest('p');
        const endP = (
          endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentElement : (endContainer as HTMLElement)
        )?.closest('p');

        const spansMultipleParagraphs = startP !== endP && startP && endP;

        if (spansMultipleParagraphs) {
          // Selection spans multiple paragraphs - create new paragraph for rewritten text

          // Trim the first paragraph to keep only the text before selection
          const originalText = targetTextNode.nodeValue || '';
          const before = originalText.substring(0, range.startOffset);
          targetTextNode.nodeValue = before;

          // Create new paragraph for rewritten text with same styling
          const newP = document.createElement('p');
          if (startP?.className) {
            newP.className = startP.className;
          }
          newP.textContent = newText;
          startP?.parentNode?.insertBefore(newP, startP.nextSibling);

          // Find and remove all paragraphs between start and end (exclusive of start, inclusive of end)
          let currentNode = startP?.nextSibling;
          const nodesToRemove: Node[] = [];

          while (currentNode && currentNode !== newP) {
            if (currentNode.nodeType === Node.ELEMENT_NODE && (currentNode as Element).nodeName === 'P') {
              // Check if this paragraph is in the selection
              if (range.intersectsNode(currentNode) || currentNode === endP) {
                nodesToRemove.push(currentNode);
                console.log('�️ Will remove paragraph:', (currentNode as Element).textContent?.substring(0, 50));
                if (currentNode === endP) break;
              }
            }
            currentNode = currentNode.nextSibling;
          }

          // Remove the collected paragraphs
          nodesToRemove.forEach(node => (node as Element).remove());
          console.log('✅ Removed', nodesToRemove.length, 'selected paragraphs');
        } else {
          // Single paragraph - modify the text node directly
          const originalText = targetTextNode.nodeValue || '';
          const before = originalText.substring(0, range.startOffset);

          // Replace the text node content
          targetTextNode.nodeValue = before + newText;

          console.log('📝 Updated text in single paragraph');

          // Delete remaining selected content in same paragraph
          const cleanupRange = document.createRange();
          cleanupRange.setStart(targetTextNode, (before + newText).length);
          cleanupRange.setEnd(endContainer, range.endOffset);

          console.log('🗑️ Deleting remaining selected content');
          cleanupRange.deleteContents();
        }
      } else {
        console.log('⚠️ No text node found, using fallback');
        // Fallback to simple replacement
        const fragment = document.createDocumentFragment();
        fragment.appendChild(document.createTextNode(newText));
        range.deleteContents();
        range.insertNode(fragment);
      }
    }

    // Store the parent element for cleanup
    const parentElement = range.commonAncestorContainer.parentElement;

    // Clean up any leftover empty elements (like empty <code>, <span>, etc.)
    if (parentElement) {
      cleanupEmptyInlineElementsUtil(parentElement);
    }

    // Clear the selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }

  /**
   * Replace selected text using replaceSelectedTextInDOM and then wrap with interactive UI
   */
  private replaceSelectedTextInDOMWithWrapper(
    range: Range,
    newText: string,
    wrapper: HTMLElement,
    buttonContainer: HTMLElement,
  ): void {
    // Store the original range boundaries before any modifications
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;

    console.log('🔍 replaceSelectedTextInDOMWithWrapper called', {
      isSameContainer: startContainer === endContainer,
      isTextNode: startContainer.nodeType === Node.TEXT_NODE,
      startOffset,
      endOffset,
      selectedText: range.toString(),
    });

    // Case 1: Selection is within a single text node (most common for mid-paragraph selections)
    const isSingleTextNode = startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE;

    if (isSingleTextNode) {
      console.log('✅ Using single text node approach (no markers)');
      const textNode = startContainer as Text;
      const originalText = textNode.nodeValue || '';

      // Split the text into: before | selected | after
      const before = originalText.substring(0, startOffset);
      const after = originalText.substring(endOffset);

      // Set the text node to only contain the "before" part
      textNode.nodeValue = before;

      // Set the wrapper content
      wrapper.textContent = newText;

      // Insert elements in the correct order: textNode | wrapper | buttonContainer | afterText
      const parent = textNode.parentNode;
      if (parent) {
        parent.insertBefore(wrapper, textNode.nextSibling);
        parent.insertBefore(buttonContainer, wrapper.nextSibling);

        if (after) {
          parent.insertBefore(document.createTextNode(after), buttonContainer.nextSibling);
        }
      }

      return;
    }

    console.log('⚠️ Using marker approach for multi-node selection');

    // Case 2: Multi-node selection - fall back to marker approach but search more carefully
    // Create a unique marker to locate the replaced text
    const marker = `__LINGUINE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}__`;
    const markedText = `${marker}${newText}${marker}`;

    // Use the robust replaceSelectedTextInDOM method
    this.replaceSelectedTextInDOM(range, markedText);

    // Find and replace the marked text with our interactive wrapper
    // Start from the original start container's parent to narrow the search
    const searchRoot =
      (startContainer.nodeType === Node.ELEMENT_NODE ? startContainer : startContainer.parentElement) || document.body;

    const walker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      if (textNode.nodeValue?.includes(marker)) {
        const text = textNode.nodeValue;
        const startPos = text.indexOf(marker);
        const endPos = text.lastIndexOf(marker) + marker.length;

        if (startPos !== -1 && endPos !== -1) {
          // Split the text node and insert our wrapper
          const before = text.substring(0, startPos);
          const after = text.substring(endPos);

          textNode.nodeValue = before;
          wrapper.textContent = newText;

          const parent = textNode.parentNode;
          if (parent) {
            parent.insertBefore(wrapper, textNode.nextSibling);
            parent.insertBefore(buttonContainer, wrapper.nextSibling);

            if (after) {
              parent.insertBefore(document.createTextNode(after), buttonContainer.nextSibling);
            }
          }
        }
        break;
      }
    }
  }

  /**
   * Rewrite the selected/highlighted text in an easier to understand way
   */
  async rewriteSelectedText() {
    if (!this.isActive) {
      throw new Error('Extension is not active. Please enable it in the popup.');
    }

    try {
      // Get the current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        throw new Error('No text selected. Please highlight some text and try again.');
      }

      const selectedText = selection.toString().trim();

      // Get the range and expand it to full word boundaries
      const originalRange = selection.getRangeAt(0);
      const expandedRange = expandSelectionToWordBoundariesUtil(originalRange);
      const expandedText = expandedRange.toString().trim();

      // Check if the selection is within an existing rewriter wrapper
      const ancestorNode = expandedRange.commonAncestorContainer;
      let existingWrapper: HTMLElement | null = null;

      // Traverse up to find if we're inside a rewriter-highlight span
      let node: Node | null = ancestorNode;
      while (node && node !== document.body) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.classList && element.classList.contains('rewriter-highlight')) {
            existingWrapper = element;
            break;
          }
        }
        node = node.parentNode;
      }

      // If we found an existing wrapper, extract the original text and remove the wrapper
      let originalText = expandedText || selectedText;
      let actualRange = expandedRange;

      if (existingWrapper) {
        console.log('🔄 Found existing rewriter wrapper, extracting original text');

        // Get the original text from the data attribute
        const storedOriginalText = existingWrapper.dataset.originalText;
        if (storedOriginalText) {
          originalText = storedOriginalText;
          console.log('📝 Using stored original text:', originalText);
        }

        // Remove the associated button container if it exists
        const buttonContainer = existingWrapper.nextElementSibling;
        if (buttonContainer && buttonContainer.classList.contains('rewriter-buttons')) {
          buttonContainer.remove();
        }

        // Replace the wrapper with a text node containing the original text
        const textNode = document.createTextNode(originalText);
        const parent = existingWrapper.parentNode;
        if (!parent) {
          throw new Error('Cannot rewrite: existing wrapper has no parent');
        }
        parent.replaceChild(textNode, existingWrapper);

        // Create a new range around this text node with explicit offsets
        actualRange = document.createRange();
        actualRange.setStart(textNode, 0);
        actualRange.setEnd(textNode, textNode.length);
      }

      // Use the expanded text as the target for rewriting
      // Use the actual range for DOM replacement (either original or newly created)
      const range = actualRange;

      // Extract surrounding context for better rewriting
      const commonAncestor = range.commonAncestorContainer;
      let contextElement: HTMLElement | null = null;

      if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
        contextElement = commonAncestor as HTMLElement;
      } else if (commonAncestor.parentElement) {
        contextElement = commonAncestor.parentElement;
      }

      let contextInfo = { beforeContext: '', afterContext: '', fullContext: originalText };
      if (contextElement) {
        contextInfo = this.extractSurroundingContext(contextElement, originalText);
      }

      // Determine languages for this rewrite
      const detectedLang = await detectLanguageFromText(contextInfo.fullContext || originalText);
      const detectedBase = rwToBaseLang(normalizeLanguageCode(detectedLang || 'en-US'));
      const nativeState = await languageStorage.get();
      const nativeBase = rwToBaseLang(nativeState?.nativeLanguage || 'en-US');

      // Initialize rewriter with per-call language settings
      const rewriter = await rewriterManager.getRewriter(
        rwBuildOptions(this.rewriterOptions, detectedBase, nativeBase),
      );

      if (!rewriter) {
        throw new Error('Failed to initialize rewriter');
      }

      // Prepare context-aware prompt - only rewrite the selected text
      const rewritePrompt = originalText; // Only the selected text to be rewritten
      let contextPrompt = 'Make this text easier to understand for language learners.';

      if (contextInfo.beforeContext || contextInfo.afterContext) {
        // Provide context in the context parameter, not in the text to be rewritten
        contextPrompt = `CONTEXT: "${contextInfo.beforeContext} [TARGET] ${contextInfo.afterContext}"

INSTRUCTIONS: 
- You will rewrite ONLY the word(s) marked as [TARGET] 
- The [TARGET] text is: "${originalText}"
- Make it easier to understand for language learners
- Your response should contain ONLY the replacement text, nothing else
- Do NOT include the surrounding context in your response
- Do NOT repeat the original text
- Do NOT provide explanations

EXAMPLE:
If context is "The cat [TARGET] quickly" and target is "ran", respond with just: "moved fast"`;
      }

      // Rewrite the text
      const rawRewrittenText = await rewriter.rewrite(rewritePrompt, {
        context: contextPrompt,
      });

      // Clean up the rewritten response
      let rewrittenText = this.cleanRewrittenResponse(rawRewrittenText);

      // Preserve original formatting patterns
      rewrittenText = preserveOriginalFormattingUtil(originalText, rewrittenText);

      // Create wrapper for the rewritten content with interactive UI
      const wrapper = document.createElement('span');
      wrapper.className = 'rewriter-highlight';
      wrapper.style.cssText = `
            background-color: #e5e7eb;
            padding: 2px 4px;
            border-radius: 3px;
            position: relative;
            display: inline;
          `;
      // we generate this before replacing the text in the DOM so that we can save the fragment to the database
      // Generate URL fragment for text anchor
      const urlFragment = this.generateTextFragment(range);

      // Store both texts as data attributes
      wrapper.dataset.originalText = originalText;
      wrapper.dataset.rewrittenText = rewrittenText;
      wrapper.textContent = rewrittenText;

      // Create button container
      const buttonContainer = document.createElement('span');
      buttonContainer.className = 'rewriter-buttons';
      buttonContainer.style.cssText = `
            display: inline-flex;
            gap: 4px;
            margin-left: 6px;
            vertical-align: middle;
          `;

      // Create button styles
      const buttonStyle = `
            padding: 2px 6px;
            font-size: 11px;
            border: 1px solid #d1d5db;
            border-radius: 3px;
            cursor: pointer;
            background: white;
            color: #374151;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: all 0.15s;
          `;

      // Toggle button (switch between original and rewritten)
      let showingRewritten = true;
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button'; // Prevent form submission
      toggleBtn.textContent = '⇄';
      toggleBtn.title = 'Toggle between original and rewritten';
      toggleBtn.style.cssText =
        buttonStyle +
        `
            color: #2563eb;
            border-color: #93c5fd;
          `;

      toggleBtn.addEventListener('mouseover', () => {
        toggleBtn.style.backgroundColor = '#dbeafe';
      });
      toggleBtn.addEventListener('mouseout', () => {
        toggleBtn.style.backgroundColor = 'white';
      });
      toggleBtn.addEventListener('click', e => {
        try {
          e.preventDefault();
          e.stopPropagation();

          console.log('🔄 Toggle button clicked, currently showing:', showingRewritten ? 'rewritten' : 'original');

          if (showingRewritten) {
            wrapper.textContent = originalText;
            wrapper.style.backgroundColor = '#fef3c7';
            toggleBtn.title = 'Showing original - click to see rewritten';
            showingRewritten = false;
            console.log('✅ Switched to original text');
          } else {
            wrapper.textContent = rewrittenText;
            wrapper.style.backgroundColor = '#e5e7eb';
            toggleBtn.title = 'Showing rewritten - click to see original';
            showingRewritten = true;
            console.log('✅ Switched to rewritten text');
          }
        } catch (error) {
          console.error('❌ Error in toggle button:', error);
        }
      });

      // Apply button
      const applyBtn = document.createElement('button');
      applyBtn.type = 'button'; // Prevent form submission
      applyBtn.textContent = '✓';
      applyBtn.title = 'Apply current version';
      applyBtn.style.cssText =
        buttonStyle +
        `
            color: #16a34a;
            border-color: #86efac;
          `;

      applyBtn.addEventListener('mouseover', () => {
        applyBtn.style.backgroundColor = '#dcfce7';
      });
      applyBtn.addEventListener('mouseout', () => {
        applyBtn.style.backgroundColor = 'white';
      });
      // Track if save is in progress to prevent duplicate saves
      let isSaving = false;

      applyBtn.addEventListener('click', async e => {
        try {
          e.preventDefault();
          e.stopPropagation();

          // Prevent duplicate clicks/saves
          if (isSaving) {
            return;
          }

          // If showing original text, revert to original and don't save
          if (!showingRewritten) {
            // Revert to original text
            wrapper.textContent = originalText;
            wrapper.style.backgroundColor = 'transparent';
            wrapper.style.padding = '0';
            wrapper.classList.remove('rewriter-highlight');

            // Remove buttons
            if (buttonContainer && buttonContainer.parentNode) {
              buttonContainer.remove();
            }

            // Clear current highlight reference
            if (this.currentHighlight === wrapper) {
              this.currentHighlight = null;
            }

            return;
          }

          // User accepted the rewritten text - save it to database
          // Mark as saving and disable button
          isSaving = true;
          applyBtn.disabled = true;
          applyBtn.style.opacity = '0.5';
          applyBtn.style.cursor = 'not-allowed';

          let saveSuccessful = false;
          try {
            const rewriterSettings =
              wrapper.dataset.rewriterSettings ||
              JSON.stringify({
                sharedContext: 'Make this text easier to understand for language learners.',
                tone: this.rewriterOptions.tone || 'more-casual',
                format: this.rewriterOptions.format || 'plain-text',
                length: this.rewriterOptions.length || 'shorter',
              });

            // Get url fragment from wrapper, ensuring it's never null/empty
            let urlFragment = wrapper.dataset.urlFragment;
            // If urlFragment is empty or null, generate a fallback
            if (!urlFragment) {
              // Try to regenerate from the current range if possible
              // Otherwise use a hash-based fallback
              const text = originalText.trim() || rewrittenText.trim() || 'text';
              const hash = Array.from(text)
                .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
                .toString(36);
              urlFragment = `#:~:text=fallback-${hash}-${Date.now()}`;
            }

            const savedRewrite = await addTextRewrite({
              original_text: originalText,
              rewritten_text: rewrittenText,
              language: normalizeLanguageCode(navigator.language || 'en-US'),
              rewriter_settings: rewriterSettings,
              source_url: window.location.href,
              url_fragment: urlFragment,
            });

            if (savedRewrite) {
              saveSuccessful = true;

              // Notify side panel about new rewrite
              try {
                await chrome.runtime.sendMessage({
                  action: 'rewriteAccepted',
                  target: 'sidepanel',
                  data: {
                    rewrite: savedRewrite,
                    url: window.location.href,
                  },
                });
              } catch {
                // Side panel might not be open, that's okay
              }
            }
          } catch (dbError) {
            const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';

            // Check if this is an extension context invalidation error
            if (
              errorMessage.includes('Extension context invalidated') ||
              errorMessage.includes('Receiving end does not exist') ||
              errorMessage.includes('Could not establish connection')
            ) {
              // Show user-friendly notification
              this.showContextInvalidationNotification();
            } else {
              console.warn('Failed to save rewrite to database:', dbError);
            }
          }

          // Only remove buttons and cleanup if save was successful
          if (saveSuccessful) {
            // Remove buttons and keep the rewritten text
            if (buttonContainer && buttonContainer.parentNode) {
              buttonContainer.remove();
            }
            wrapper.style.backgroundColor = 'transparent';
            wrapper.style.padding = '0';
            wrapper.classList.remove('rewriter-highlight');

            // Clear current highlight reference
            if (this.currentHighlight === wrapper) {
              this.currentHighlight = null;
            }
            // No longer interactive; remove from registry
            undoManager.unregisterWrapper(wrapper);
            isSaving = false;
          } else {
            // Save failed - keep buttons visible so user can try again
            isSaving = false;
            applyBtn.disabled = false;
            applyBtn.style.opacity = '1';
            applyBtn.style.cursor = 'pointer';
          }
        } catch (error) {
          console.error('❌ Error in apply button:', error);
          // Reset saving flag on error
          isSaving = false;
          applyBtn.disabled = false;
          applyBtn.style.opacity = '1';
          applyBtn.style.cursor = 'pointer';
        }
      });

      // Assemble buttons
      buttonContainer.appendChild(toggleBtn);
      buttonContainer.appendChild(applyBtn);

      // Use replaceSelectedTextInDOM for robust text replacement, then wrap the result
      this.replaceSelectedTextInDOMWithWrapper(range, rewrittenText, wrapper, buttonContainer);
      // Track for undo
      undoManager.registerWrapper(wrapper);

      // Clean up any stray markers that might have been left in the document
      cleanupStrayMarkersInDocUtil(document.body);

      // Update current highlight reference
      this.currentHighlight = wrapper;

      // Store rewrite data for later saving (when user accepts)
      // Store in wrapper data attributes for access in apply button handler
      wrapper.dataset.urlFragment = urlFragment || '';
      wrapper.dataset.rewriterSettings = JSON.stringify({
        sharedContext: 'Make this text easier to understand for language learners.',
        tone: this.rewriterOptions.tone || 'more-casual',
        format: this.rewriterOptions.format || 'plain-text',
        length: this.rewriterOptions.length || 'shorter',
      });

      return {
        originalText,
        rewrittenText,
        textSelected: true,
      };
    } catch (error) {
      console.error('❌ Error rewriting selected text:', error);
      throw error;
    }
  }

  /**
   * Generate URL fragment for text anchor using the text fragments API
   * Always returns a valid fragment string, using fallback methods if automatic generation fails
   */
  generateTextFragment(range: Range): string {
    try {
      return generateFragmentStringHashFromRange(range);
    } catch (error) {
      console.error('Error generating text fragment, using ultimate fallback:', error);
      // Ultimate fallback - should never happen, but ensures we always return a string
      const text = range.toString().trim() || 'text';
      const hash = Array.from(text)
        .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
        .toString(36);
      return `#:~:text=fallback-${hash}-${Date.now()}`;
    }
  }

  /**
   * Show a user-friendly notification when extension context is invalidated
   */
  showContextInvalidationNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'linguine-context-invalidation-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000001;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #92400e;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="flex-shrink: 0; margin-top: 2px;">⚠️</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Extension Context Invalidated</div>
          <div style="margin-bottom: 8px;">Your text rewrite was successful, but it couldn't be saved to the database. This usually happens when the extension is reloaded.</div>
          <div style="font-size: 12px; color: #a16207;">
            <strong>Solution:</strong> Refresh this page or reload the extension to restore full functionality.
          </div>
        </div>
        <button 
          onclick="this.parentElement.parentElement.remove()" 
          style="
            background: none; 
            border: none; 
            font-size: 18px; 
            cursor: pointer; 
            color: #92400e; 
            padding: 0; 
            margin-left: auto;
            flex-shrink: 0;
          "
          title="Close notification"
        >
          ×
        </button>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }
}
