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
  private floatingWidget: HTMLElement | null;
  private isDragging: boolean;
  private dragOffset: { x: number; y: number };

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
      tone: 'as-is',
      format: 'as-is',
      length: 'shorter',
    };
    this.downloadProgress = 0;
    this.isDownloading = false;

    // Floating widget state
    this.floatingWidget = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

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
      this.createFloatingWidget();
    } else {
      this.removeSelectionMode(); // Ensure it's cleaned up if inactive
      this.removeFloatingWidget();
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
          this.createFloatingWidget();
        } else if (!this.isActive && wasActive) {
          this.removeHighlights();
          this.removeCurrentHighlight();
          this.removeSelectionMode();
          this.removeFloatingWidget();
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
      const sentenceEnd = this.findSentenceEnd(fullText, targetIndex + targetText.length);
      const sentenceStart = this.findSentenceStart(fullText, targetIndex);

      // Extract context within the same sentence
      const beforeContext = fullText.substring(sentenceStart, targetIndex).trim();
      const afterContext = fullText.substring(targetIndex + targetText.length, sentenceEnd).trim();
      const fullContext = fullText.substring(sentenceStart, sentenceEnd).trim();

      console.log('🔍 Sentence boundary detection:', {
        targetText: targetText.substring(0, 30) + '...',
        sentenceStart,
        sentenceEnd,
        fullSentence: fullContext.substring(0, 100) + '...',
      });

      return { beforeContext, afterContext, fullContext };
    } catch (error) {
      console.warn('Error extracting context:', error);
      return { beforeContext: '', afterContext: '', fullContext: targetText };
    }
  }

  /**
   * Find the start of the sentence containing the given position
   */
  private findSentenceStart(text: string, position: number): number {
    // Common sentence ending punctuation followed by whitespace or start of text
    const sentenceEnders = /[.!?]\s+/g;

    // Look backwards from the position to find the previous sentence ending
    const textBefore = text.substring(0, position);
    let lastMatch = 0;
    let match;

    // Reset regex lastIndex to ensure proper matching
    sentenceEnders.lastIndex = 0;

    while ((match = sentenceEnders.exec(textBefore)) !== null) {
      lastMatch = match.index + match[0].length;
    }

    return lastMatch;
  }

  /**
   * Find the end of the sentence containing the given position
   */
  private findSentenceEnd(text: string, position: number): number {
    // Common sentence ending punctuation, optionally followed by whitespace or end of text
    const sentenceEnders = /[.!?](?=\s|$)/;

    // Look forward from the position to find the next sentence ending
    const textAfter = text.substring(position);
    const match = textAfter.match(sentenceEnders);

    if (match && match.index !== undefined) {
      // Include the punctuation mark
      return position + match.index + 1;
    }

    // If no sentence ending found, return the end of the text
    return text.length;
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

      // Extract surrounding context for better rewriting
      const contextInfo = this.extractSurroundingContext(highlightSpan, originalText);
      console.log('📖 Context extracted:', {
        before: contextInfo.beforeContext.substring(-30),
        target: originalText,
        after: contextInfo.afterContext.substring(0, 30),
      });

      // Initialize rewriter
      const rewriter = await this.initRewriter();

      // Prepare context-aware prompt - only rewrite the highlighted text
      const rewritePrompt = originalText; // Only the highlighted text to be rewritten
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
      console.log('✨ Rewriting with context...');
      const rawRewrittenText = await rewriter.rewrite(rewritePrompt, {
        context: contextPrompt,
      });

      // Clean up the rewritten response
      let rewrittenText = this.cleanRewrittenResponse(rawRewrittenText);

      console.log('🔧 Response processing:', {
        original: originalText,
        rawResponse: rawRewrittenText.substring(0, 100) + '...',
        cleaned: rewrittenText.substring(0, 50) + '...',
      });

      // Preserve original formatting patterns
      rewrittenText = this.preserveOriginalFormatting(originalText, rewrittenText);

      console.log('✅ Final rewritten text:', rewrittenText.substring(0, 50) + '...');

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
      // const buttonContainer = document.createElement('span');
      // buttonContainer.className = 'rewriter-buttons';
      // buttonContainer.style.cssText = `
      //       display: inline-flex;
      //       gap: 4px;
      //       margin-left: 6px;
      //       vertical-align: middle;
      //     `;

      // Create button styles
      // const buttonStyle = `
      //       padding: 2px 6px;
      //       font-size: 11px;
      //       border: 1px solid #d1d5db;
      //       border-radius: 3px;
      //       cursor: pointer;
      //       background: white;
      //       color: #374151;
      //       font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      //       transition: all 0.15s;
      //     `;

      // Toggle button (switch between original and rewritten)
      // let showingRewritten = true;
      // const toggleBtn = document.createElement('button');
      // toggleBtn.textContent = '⇄';
      // toggleBtn.title = 'Toggle between original and rewritten';
      // toggleBtn.style.cssText =
      //   buttonStyle +
      //   `
      //       color: #2563eb;
      //       border-color: #93c5fd;
      //     `;

      // toggleBtn.addEventListener('mouseover', () => {
      //   toggleBtn.style.backgroundColor = '#dbeafe';
      // });
      // toggleBtn.addEventListener('mouseout', () => {
      //   toggleBtn.style.backgroundColor = 'white';
      // });
      // toggleBtn.addEventListener('click', () => {
      //   if (showingRewritten) {
      //     wrapper.textContent = originalText;
      //     wrapper.style.backgroundColor = '#fef3c7';
      //     toggleBtn.title = 'Showing original - click to see rewritten';
      //     showingRewritten = false;
      //   } else {
      //     wrapper.textContent = rewrittenText;
      //     wrapper.style.backgroundColor = '#e5e7eb';
      //     toggleBtn.title = 'Showing rewritten - click to see original';
      //     showingRewritten = true;
      //   }
      // });

      // Apply button
      // const applyBtn = document.createElement('button');
      // applyBtn.textContent = '✓';
      // applyBtn.title = 'Apply current version';
      // applyBtn.style.cssText =
      //   buttonStyle +
      //   `
      //       color: #16a34a;
      //       border-color: #86efac;
      //     `;

      // applyBtn.addEventListener('mouseover', () => {
      //   applyBtn.style.backgroundColor = '#dcfce7';
      // });
      // applyBtn.addEventListener('mouseout', () => {
      //   applyBtn.style.backgroundColor = 'white';
      // });
      // applyBtn.addEventListener('click', () => {
      //   // Remove buttons and keep the current text
      //   buttonContainer.remove();
      //   wrapper.style.backgroundColor = 'transparent';
      //   wrapper.style.padding = '0';
      //   wrapper.classList.remove('rewriter-highlight');

      //   // Clear current highlight reference
      //   if (this.currentHighlight === highlightSpan) {
      //     this.currentHighlight = null;
      //   }
      // });

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
      // buttonContainer.appendChild(toggleBtn);
      // buttonContainer.appendChild(applyBtn);
      // buttonContainer.appendChild(saveBtn);

      // Replace the highlight span with the new interactive content
      const parent = highlightSpan.parentNode;
      if (parent) {
        parent.insertBefore(wrapper, highlightSpan);
        // parent.insertBefore(buttonContainer, highlightSpan);
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
   * Replace selected text in the DOM while preserving position, font, and style
   */
  replaceSelectedTextInDOM(range: Range, newText: string): void {
    // Store the parent element for cleanup
    const parentElement = range.commonAncestorContainer.parentElement;

    // Create a document fragment to hold the new text
    // This handles newlines and preserves whitespace better
    const fragment = document.createDocumentFragment();

    // Split text by newlines to preserve paragraph structure
    const lines = newText.split('\n');

    lines.forEach((line, index) => {
      // Add text node for the line
      fragment.appendChild(document.createTextNode(line));

      // Add line break between lines (except after the last one)
      if (index < lines.length - 1) {
        fragment.appendChild(document.createElement('br'));
      }
    });

    // Delete the old content and insert the new fragment
    range.deleteContents();
    range.insertNode(fragment);

    // Clean up any leftover empty elements (like empty <code>, <span>, etc.)
    if (parentElement) {
      this.cleanupEmptyElements(parentElement);
    }

    // Clear the selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    console.log('✅ Text replaced in DOM successfully');
  }

  /**
   * Remove empty inline elements that might be left over after text replacement
   */
  private cleanupEmptyElements(container: HTMLElement): void {
    const emptyElements = container.querySelectorAll('code, span, em, strong, i, b, mark, small, del, ins, sub, sup');

    emptyElements.forEach(element => {
      // Remove if element is empty or contains only whitespace
      if (!element.textContent || element.textContent.trim() === '') {
        element.remove();
      }
    });
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
        console.log('📖 Selection context extracted:', {
          before: contextInfo.beforeContext.substring(-30),
          target: originalText,
          after: contextInfo.afterContext.substring(0, 30),
        });
      }

      // Initialize rewriter
      const rewriter = await this.initRewriter();

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
      console.log('✨ Rewriting with context...');
      const rawRewrittenText = await rewriter.rewrite(rewritePrompt, {
        context: contextPrompt,
      });

      // Clean up the rewritten response
      let rewrittenText = this.cleanRewrittenResponse(rawRewrittenText);

      console.log('🔧 Response processing:', {
        original: originalText,
        rawResponse: rawRewrittenText.substring(0, 100) + '...',
        cleaned: rewrittenText.substring(0, 50) + '...',
      });

      // Preserve original formatting patterns
      rewrittenText = this.preserveOriginalFormatting(originalText, rewrittenText);

      console.log('✅ Final rewritten text:', rewrittenText);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📄 ORIGINAL:', originalText);
      console.log('✨ REWRITTEN:', rewrittenText);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Replace the selected text in the DOM with the rewritten version
      this.replaceSelectedTextInDOM(range, rewrittenText);

      // // Create a wrapper span to replace the selected text
      // const wrapper = document.createElement('span');
      // wrapper.className = 'rewriter-highlight';
      // wrapper.style.cssText = `
      //       background-color: #e5e7eb;
      //       padding: 2px 4px;
      //       border-radius: 3px;
      //       position: relative;
      //       display: inline;
      //     `;

      // // Store original text as data attribute
      // wrapper.dataset.originalText = originalText;
      // wrapper.dataset.rewrittenText = rewrittenText;
      // wrapper.textContent = rewrittenText;

      // // Create button container
      // const buttonContainer = document.createElement('span');
      // buttonContainer.className = 'rewriter-buttons';
      // buttonContainer.style.cssText = `
      //       display: inline-flex;
      //       gap: 4px;
      //       margin-left: 6px;
      //       vertical-align: middle;
      //     `;

      // // Create small buttons
      // const buttonStyle = `
      //       padding: 2px 6px;
      //       font-size: 11px;
      //       border: 1px solid #d1d5db;
      //       border-radius: 3px;
      //       cursor: pointer;
      //       background: white;
      //       color: #374151;
      //       font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      //       transition: all 0.15s;
      //     `;

      // // Toggle button (switch between original and rewritten)
      // let showingRewritten = true;
      // const toggleBtn = document.createElement('button');
      // toggleBtn.textContent = '⇄';
      // toggleBtn.title = 'Toggle between original and rewritten';
      // toggleBtn.style.cssText =
      //   buttonStyle +
      //   `
      //       color: #2563eb;
      //       border-color: #93c5fd;
      //     `;
      // toggleBtn.addEventListener('mouseover', () => {
      //   toggleBtn.style.backgroundColor = '#dbeafe';
      // });
      // toggleBtn.addEventListener('mouseout', () => {
      //   toggleBtn.style.backgroundColor = 'white';
      // });
      // toggleBtn.addEventListener('click', () => {
      //   if (showingRewritten) {
      //     wrapper.textContent = originalText;
      //     wrapper.style.backgroundColor = '#fef3c7';
      //     toggleBtn.title = 'Showing original - click to see rewritten';
      //     showingRewritten = false;
      //   } else {
      //     wrapper.textContent = rewrittenText;
      //     wrapper.style.backgroundColor = '#e5e7eb';
      //     toggleBtn.title = 'Showing rewritten - click to see original';
      //     showingRewritten = true;
      //   }
      // });

      // // Apply button
      // const applyBtn = document.createElement('button');
      // applyBtn.textContent = '✓';
      // applyBtn.title = 'Apply current version';
      // applyBtn.style.cssText =
      //   buttonStyle +
      //   `
      //       color: #16a34a;
      //       border-color: #86efac;
      //     `;
      // applyBtn.addEventListener('mouseover', () => {
      //   applyBtn.style.backgroundColor = '#dcfce7';
      // });
      // applyBtn.addEventListener('mouseout', () => {
      //   applyBtn.style.backgroundColor = 'white';
      // });
      // applyBtn.addEventListener('click', () => {
      //   // Remove buttons and keep the current text (whatever is showing)
      //   buttonContainer.remove();
      //   wrapper.style.backgroundColor = 'transparent';
      //   wrapper.style.padding = '0';
      // });

      // // Assemble buttons
      // buttonContainer.appendChild(toggleBtn);
      // buttonContainer.appendChild(applyBtn);

      // // Replace the selected text with wrapper
      // range.deleteContents();
      // range.insertNode(buttonContainer);
      // range.insertNode(wrapper);

      // // Clear selection
      // selection.removeAllRanges();

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
   * Draggable floating widget
   */
  createFloatingWidget() {
    // Remove existing widget if any
    this.removeFloatingWidget();

    // Create the widget
    const widget = document.createElement('div');
    widget.id = 'linguine-floating-widget';
    widget.title = 'Click to rewrite selected text';

    // Create image element
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('pasta-icon.webp');
    img.alt = 'Linguine Rewriter';
    img.style.cssText = `
        width: 70%;
        height: 70%;
        object-fit: contain;
      `;

    widget.appendChild(img);

    // Style the widget
    widget.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: move;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        user-select: none;
        transition: transform 0.2s, box-shadow 0.2s;
        overflow: hidden;
      `;

    // Add hover effect
    widget.addEventListener('mouseenter', () => {
      widget.style.transform = 'scale(1.1)';
      widget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    });

    widget.addEventListener('mouseleave', () => {
      if (!this.isDragging) {
        widget.style.transform = 'scale(1)';
        widget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }
    });

    // Handle drag start
    widget.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      const rect = widget.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      widget.style.cursor = 'grabbing';
      e.preventDefault();
    });

    // Handle dragging
    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging || !this.floatingWidget) return;

      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;

      // Keep widget within viewport
      const maxX = window.innerWidth - this.floatingWidget.offsetWidth;
      const maxY = window.innerHeight - this.floatingWidget.offsetHeight;

      const boundedX = Math.max(0, Math.min(x, maxX));
      const boundedY = Math.max(0, Math.min(y, maxY));

      this.floatingWidget.style.left = `${boundedX}px`;
      this.floatingWidget.style.top = `${boundedY}px`;
      this.floatingWidget.style.bottom = 'auto';
      this.floatingWidget.style.right = 'auto';
    };

    // Handle drag end
    const handleMouseUp = () => {
      if (this.isDragging && this.floatingWidget) {
        this.isDragging = false;
        this.floatingWidget.style.cursor = 'move';
        this.floatingWidget.style.transform = 'scale(1)';
        this.floatingWidget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }
    };

    // Handle click (rewrite selected text)
    widget.addEventListener('click', async () => {
      // Only trigger rewrite if not dragging
      if (this.isDragging) return;

      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        // Show error state by changing background color briefly
        const originalBg = widget.style.background;
        widget.style.background = '#f87171'; // Softer coral red
        widget.title = 'Please select some text first';

        // Create tooltip popup
        const tooltip = document.createElement('div');
        tooltip.textContent = 'Please select some text first';
        tooltip.style.cssText = `
          position: fixed;
          bottom: 80px;
          right: 20px;
          background: #1f2937;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 1000000;
          pointer-events: none;
          animation: fadeIn 0.2s ease-out;
        `;

        // Add fade-in animation
        if (!document.getElementById('linguine-tooltip-animation')) {
          const style = document.createElement('style');
          style.id = 'linguine-tooltip-animation';
          style.textContent = `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `;
          document.head.appendChild(style);
        }

        document.body.appendChild(tooltip);

        setTimeout(() => {
          widget.style.background = originalBg;
          widget.title = 'Click to rewrite selected text';
          tooltip.remove();
        }, 1500);
        return;
      }

      try {
        // Show loading state - make widget spin (keeps the pasta image)
        widget.style.animation = 'spin 1s linear infinite';
        widget.title = 'Rewriting...';
        widget.style.cursor = 'wait';

        // Add keyframe animation if not already added
        if (!document.getElementById('linguine-spin-animation')) {
          const style = document.createElement('style');
          style.id = 'linguine-spin-animation';
          style.textContent = `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
        }

        // Trigger the rewrite
        await this.rewriteSelectedText();

        // Stop spinning and show success with green background
        widget.style.animation = '';
        const originalBg = widget.style.background;
        widget.style.background = '#4ade80'; // Fresh bright green
        widget.title = 'Rewrite complete!';
        setTimeout(() => {
          widget.style.background = originalBg;
          widget.title = 'Click to rewrite selected text';
          widget.style.cursor = 'move';
        }, 1500);
      } catch (error) {
        console.error('Error rewriting from widget:', error);
        widget.style.animation = ''; // Stop spinning on error
        const originalBg = widget.style.background;
        widget.style.background = '#f87171'; // Softer coral red
        widget.title = 'Rewrite failed';
        setTimeout(() => {
          widget.style.background = originalBg;
          widget.title = 'Click to rewrite selected text';
          widget.style.cursor = 'move';
        }, 1500);
      }
    });

    // Attach event listeners to document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Store cleanup function
    widget.dataset.cleanup = 'true';

    // Add to DOM
    document.body.appendChild(widget);
    this.floatingWidget = widget;
  }

  /**
   * Remove the floating widget
   */
  removeFloatingWidget() {
    if (this.floatingWidget && this.floatingWidget.parentNode) {
      this.floatingWidget.parentNode.removeChild(this.floatingWidget);
      this.floatingWidget = null;
    }
  }
}
