// Word Replacer Content Script
// This script runs on every webpage and handles both word replacement and selection
// Users can select text to add replacements and see replacements applied in real-time

declare global {
  interface Window {
    Rewriter: {
      availability(): Promise<'available' | 'downloadable' | 'unavailable'>;
      create(options: RewriterOptions): Promise<Rewriter>;
    };
  }
}

type RewriterOptions = {
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  tone?: string;
  format?: string;
  length?: string;
  monitor?: (monitor: DownloadMonitor) => void;
};

type DownloadMonitor = {
  addEventListener(type: 'downloadprogress', listener: (event: ProgressEvent) => void): void;
};

type Rewriter = {
  rewrite(text: string, options?: { context?: string }): Promise<string>;
  ready: Promise<void>;
};

export class WordReplacer {
  private replacements: Map<string, string>;
  private isActive: boolean;
  private highlightColor: string;
  private observer: MutationObserver | null;
  private selectedWords: Set<string>;
  private currentHighlight: HTMLElement | null;
  private rewriter: Rewriter | null; // Type from Chrome's experimental AI API (not in TS types)
  private isRewriterReady: boolean;
  private rewriterOptions: RewriterOptions;
  private downloadProgress: number;
  private isDownloading: boolean;
  private replaceTimeout?: ReturnType<typeof setTimeout>;
  private handleSelection?: ((event: MouseEvent) => void) | null;

  constructor() {
    this.replacements = new Map();
    this.isActive = false;
    this.highlightColor = '#fbbf24';
    this.observer = null;
    this.selectedWords = new Set();
    this.currentHighlight = null; // Track the currently highlighted element

    // Rewriter API state
    this.rewriter = null;
    this.isRewriterReady = false;
    this.rewriterOptions = {
      sharedContext: 'Use simpler vocabulary so I can understand this text.',
      tone: 'more-casual',
      format: 'plain-text',
      length: 'shorter',
    };
    this.downloadProgress = 0;
    this.isDownloading = false;

    // Initialize the extension
    this.init();
  }

  async init() {
    // Load settings from storage
    await this.loadSettings();

    // Set up message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

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
      const result = await chrome.storage.sync.get(['wordReplacer']);
      const settings = result.wordReplacer || {};

      this.isActive = settings.isActive || false;
      this.highlightColor = settings.highlightColor || '#fbbf24';
      this.replacements = new Map(settings.replacements || []);

      // Load rewriter options
      this.rewriterOptions = {
        sharedContext:
          settings.rewriterOptions?.sharedContext ||
          'I am learning this language. Use simpler vocabulary in its original language so I can understand this text.',
        tone: settings.rewriterOptions?.tone || 'more-casual',
        format: settings.rewriterOptions?.format || 'plain-text',
        length: settings.rewriterOptions?.length || 'shorter',
      };

      console.log('Word Replacer: Settings loaded', {
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
      const settings = {
        isActive: this.isActive,
        highlightColor: this.highlightColor,
        replacements: Array.from(this.replacements.entries()),
        rewriterOptions: this.rewriterOptions,
      };

      await chrome.storage.sync.set({ wordReplacer: settings });
    } catch (error) {
      console.error('Word Replacer: Error saving settings', error);
    }
  }

  handleMessage(
    message: { action: string; [key: string]: unknown },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ): boolean | void {
    switch (message.action) {
      case 'updateState': {
        // Single handler for all state updates
        const state = message.state as {
          isActive?: boolean;
          rewriterOptions?: RewriterOptions;
        };

        const wasActive = this.isActive;

        // Update state
        if (state.isActive !== undefined) {
          this.isActive = state.isActive;
        }
        if (state.rewriterOptions) {
          // Shallow merge two objects
          this.rewriterOptions = {
            ...this.rewriterOptions,
            ...state.rewriterOptions,
          };
          // Reset rewriter when options change
          this.isRewriterReady = false;
          this.rewriter = null;
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
        sendResponse({ success: true });
        break;
      }

      case 'addReplacement':
        this.replacements.set(message.original as string, message.replacement as string);
        this.saveSettings();
        if (this.isActive) {
          this.replaceWordsInPage();
        }
        sendResponse({ success: true });
        break;

      case 'removeReplacement':
        this.replacements.delete(message.original as string);
        this.saveSettings();
        if (this.isActive) {
          this.replaceWordsInPage();
        }
        sendResponse({ success: true });
        break;

      case 'getState':
        sendResponse({
          success: true,
          state: {
            isActive: this.isActive,
            replacements: Array.from(this.replacements.entries()),
            highlightColor: this.highlightColor,
          },
        });
        break;

      case 'rewriteSelectedText':
        if (!this.isActive) {
          sendResponse({
            success: false,
            error: 'Extension is not active. Please enable it in the popup.',
          });
          break;
        }

        this.rewriteSelectedText()
          .then(result => {
            sendResponse({ success: true, ...result });
          })
          .catch(error => {
            sendResponse({
              success: false,
              error: error.message,
            });
          });
        return true; // Keep message channel open for async response

      case 'checkRewriterAvailability':
        this.checkRewriterAvailability()
          .then(result => {
            sendResponse({ success: true, ...result });
          })
          .catch(error => {
            sendResponse({
              success: false,
              error: error.message,
            });
          });
        return true;

      case 'updateRewriterOptions':
        this.rewriterOptions = {
          ...this.rewriterOptions,
          ...(message.options as Partial<RewriterOptions>),
        };
        // Reset rewriter when options change
        this.isRewriterReady = false;
        this.rewriter = null;
        this.saveSettings();
        sendResponse({ success: true });
        break;

      case 'getRewriterOptions':
        sendResponse({
          success: true,
          options: this.rewriterOptions,
        });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
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
        this.highlightSelectedWord(selectedText, selection);
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

  expandSelectionToWordBoundaries(range: Range): Range {
    // Clone the range to avoid modifying the original
    const expandedRange = range.cloneRange();

    // Get the start and end containers
    const startContainer = expandedRange.startContainer;
    const endContainer = expandedRange.endContainer;

    // Expand start boundary
    if (startContainer.nodeType === Node.TEXT_NODE) {
      const text = startContainer.textContent;
      if (!text) {
        return expandedRange;
      }
      let startOffset = expandedRange.startOffset;

      // Move backwards to find word boundary
      while (startOffset > 0 && /\w/.test(text[startOffset - 1])) {
        startOffset--;
      }
      expandedRange.setStart(startContainer, startOffset);
    }

    // Expand end boundary
    if (endContainer.nodeType === Node.TEXT_NODE) {
      const text = endContainer.textContent;
      if (!text) {
        return expandedRange;
      }
      let endOffset = expandedRange.endOffset;

      // Move forwards to find word boundary
      while (endOffset < text.length && /\w/.test(text[endOffset])) {
        endOffset++;
      }
      expandedRange.setEnd(endContainer, endOffset);
    }

    return expandedRange;
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
    const range = this.expandSelectionToWordBoundaries(selection.getRangeAt(0));
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
   * Rewrite highlighted text using AI and create interactive UI
   */
  async rewriteHighlightedText(originalText: string, highlightSpan: HTMLElement): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ Extension is not active, rewriting disabled');
      return;
    }

    try {
      console.log('🔄 Starting AI rewrite for:', originalText.substring(0, 50) + '...');

      // Show loading state
      highlightSpan.style.backgroundColor = '#fbbf24';
      highlightSpan.title = 'Rewriting with AI...';

      // Initialize rewriter
      const rewriter = await this.initRewriter();

      // Rewrite the text
      console.log('✨ Rewriting...');
      const rawRewrittenText = await rewriter.rewrite(originalText, {
        context: 'Make this text easier to understand for language learners.',
      });

      // Preserve original formatting patterns
      const rewrittenText = this.preserveOriginalFormatting(originalText, rawRewrittenText);

      console.log('✅ Rewritten text:', rewrittenText.substring(0, 50) + '...');

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
      toggleBtn.addEventListener('click', () => {
        if (showingRewritten) {
          wrapper.textContent = originalText;
          wrapper.style.backgroundColor = '#fef3c7';
          toggleBtn.title = 'Showing original - click to see rewritten';
          showingRewritten = false;
        } else {
          wrapper.textContent = rewrittenText;
          wrapper.style.backgroundColor = '#e5e7eb';
          toggleBtn.title = 'Showing rewritten - click to see original';
          showingRewritten = true;
        }
      });

      // Apply button
      const applyBtn = document.createElement('button');
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
      applyBtn.addEventListener('click', () => {
        // Remove buttons and keep the current text
        buttonContainer.remove();
        wrapper.style.backgroundColor = 'transparent';
        wrapper.style.padding = '0';
        wrapper.classList.remove('rewriter-highlight');

        // Clear current highlight reference
        if (this.currentHighlight === highlightSpan) {
          this.currentHighlight = null;
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

  /**
   * Analyze the formatting patterns of the original text
   */
  analyzeTextFormatting(text: string): {
    hasCapitalization: boolean;
    hasPunctuation: boolean;
    startsWithCapital: boolean;
    endsWithPunctuation: boolean;
  } {
    const trimmedText = text.trim();

    return {
      hasCapitalization: /[A-Z]/.test(trimmedText),
      hasPunctuation: /[.!?,:;]/.test(trimmedText),
      startsWithCapital: /^[A-Z]/.test(trimmedText),
      endsWithPunctuation: /[.!?]$/.test(trimmedText),
    };
  }

  /**
   * Apply the original text's formatting patterns to the rewritten text
   */
  preserveOriginalFormatting(originalText: string, rewrittenText: string): string {
    const originalFormatting = this.analyzeTextFormatting(originalText);
    let processedText = rewrittenText.trim();

    // If the original text has no capitalization, convert rewritten text to lowercase
    if (!originalFormatting.hasCapitalization) {
      processedText = processedText.toLowerCase();
    } else if (originalFormatting.startsWithCapital && processedText.length > 0) {
      // Preserve the capital at the start if original had it
      processedText = processedText.charAt(0).toUpperCase() + processedText.slice(1);
    }

    // If the original text has no punctuation, remove punctuation from rewritten text
    if (!originalFormatting.hasPunctuation) {
      processedText = processedText.replace(/[.!?,:;]/g, '');
    } else if (originalFormatting.endsWithPunctuation && !/[.!?]$/.test(processedText)) {
      // If original ended with punctuation but rewritten doesn't, add a period
      processedText += '.';
    }

    return processedText;
  }

  removeHighlights() {
    // Remove current highlight reference
    this.currentHighlight = null;

    // Remove all word replacer highlights
    const highlights = document.querySelectorAll('.word-replacer-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });

    // Remove processed markers
    const processed = document.querySelectorAll('.word-replacer-processed');
    processed.forEach(element => {
      element.classList.remove('word-replacer-processed');
    });
  }

  /**
   * Check if Rewriter API is available
   */
  async checkRewriterAvailability() {
    try {
      if (!('Rewriter' in self)) {
        return {
          available: false,
          error: 'Rewriter API not found in browser',
        };
      }

      const availability = await window.Rewriter.availability();
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
    if (this.isRewriterReady && this.rewriter) {
      return this.rewriter;
    }

    try {
      console.log('🚀 Initializing Rewriter API...');

      if (!('Rewriter' in self)) {
        throw new Error('Rewriter API not available');
      }

      const availability = await window.Rewriter.availability();
      console.log('📊 Rewriter availability:', availability);

      if (availability === 'unavailable') {
        throw new Error('Rewriter is not supported on this device');
      }

      // Create rewriter with configurable settings
      const options: RewriterOptions = {
        sharedContext: this.rewriterOptions.sharedContext || undefined,
        expectedInputLanguages: ['en', 'ja', 'es'],
        expectedContextLanguages: ['en', 'ja', 'es'],
        tone: this.rewriterOptions.tone !== 'as-is' ? this.rewriterOptions.tone : undefined,
        format: this.rewriterOptions.format !== 'as-is' ? this.rewriterOptions.format : undefined,
        length: this.rewriterOptions.length !== 'as-is' ? this.rewriterOptions.length : undefined,
        monitor: (m: DownloadMonitor) => {
          console.log('📡 Monitor callback activated (Rewriter)');
          m.addEventListener('downloadprogress', (e: ProgressEvent) => {
            this.downloadProgress = Math.round((e.loaded / e.total) * 100);
            console.log(`📥 Rewriter download: ${this.downloadProgress}%`);
          });
        },
      };

      this.rewriter = await window.Rewriter.create(options);
      await this.rewriter.ready;
      this.isRewriterReady = true;
      console.log('✅ Rewriter ready!');

      return this.rewriter;
    } catch (error) {
      console.error('❌ Failed to initialize Rewriter:', error);
      throw error;
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
      console.log('🔄 Starting selected text rewrite...');

      // Get the current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        throw new Error('No text selected. Please highlight some text and try again.');
      }

      const selectedText = selection.toString().trim();

      console.log('📝 Selected text:', selectedText.substring(0, 100) + '...');

      // Get the range
      const range = selection.getRangeAt(0);
      const originalText = selectedText;

      // Initialize rewriter
      const rewriter = await this.initRewriter();

      // Rewrite the text
      console.log('✨ Rewriting...');
      const rawRewrittenText = await rewriter.rewrite(originalText, {
        context: 'Make this text easier to understand for language learners.',
      });

      // Preserve original formatting patterns
      const rewrittenText = this.preserveOriginalFormatting(originalText, rawRewrittenText);

      console.log('✅ Rewritten text:', rewrittenText.substring(0, 100) + '...');

      // Create a wrapper span to replace the selected text
      const wrapper = document.createElement('span');
      wrapper.className = 'rewriter-highlight';
      wrapper.style.cssText = `
          background-color: #e5e7eb;
          padding: 2px 4px;
          border-radius: 3px;
          position: relative;
          display: inline;
        `;

      // Store original text as data attribute
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

      // Create small buttons
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
      toggleBtn.addEventListener('click', () => {
        if (showingRewritten) {
          wrapper.textContent = originalText;
          wrapper.style.backgroundColor = '#fef3c7';
          toggleBtn.title = 'Showing original - click to see rewritten';
          showingRewritten = false;
        } else {
          wrapper.textContent = rewrittenText;
          wrapper.style.backgroundColor = '#e5e7eb';
          toggleBtn.title = 'Showing rewritten - click to see original';
          showingRewritten = true;
        }
      });

      // Apply button
      const applyBtn = document.createElement('button');
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
      applyBtn.addEventListener('click', () => {
        // Remove buttons and keep the current text (whatever is showing)
        buttonContainer.remove();
        wrapper.style.backgroundColor = 'transparent';
        wrapper.style.padding = '0';
      });

      // Assemble buttons
      buttonContainer.appendChild(toggleBtn);
      buttonContainer.appendChild(applyBtn);

      // Replace the selected text with wrapper
      range.deleteContents();
      range.insertNode(buttonContainer);
      range.insertNode(wrapper);

      // Clear selection
      selection.removeAllRanges();

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
}
