import { WordReplacer, scrollToText, TextAnnotateManager } from '@extension/api';
import { sampleFunction } from '@src/sample-function';

void sampleFunction();

// Initialize the word replacer when the script loads
const wordReplacer = WordReplacer.getInstance();

// Initialize text annotate manager
let textAnnotateManager: TextAnnotateManager | null = null;
try {
  textAnnotateManager = TextAnnotateManager.getInstance();

  // Set up React UI callbacks that send messages to content-ui
  textAnnotateManager.setUICallbacks({
    onShow: (title, plainText, totalChunks, isSimplifyMode) => {
      // Send message to content-ui to show reading mode
      chrome.runtime
        .sendMessage({
          action: 'readingModeShow',
          target: 'content-ui',
          data: {
            title,
            plainText: plainText || '',
            chunks: [],
            progress: {
              completed: 0,
              total: totalChunks || 0,
              isComplete: false,
              phase: 'Initializing...',
            },
            isSimplifyMode: isSimplifyMode || false,
          },
        })
        .catch(() => {
          // Ignore errors
        });
    },
    onUpdate: (chunks, isComplete, totalChunks, phase, metrics, isSimplifyMode) => {
      // Send message to content-ui to update reading mode
      chrome.runtime
        .sendMessage({
          action: 'readingModeUpdate',
          target: 'content-ui',
          data: {
            chunks,
            progress: {
              completed: chunks.length,
              total: totalChunks,
              isComplete,
              phase: phase || 'Processing...',
            },
            isSimplifyMode: isSimplifyMode || false,
          },
        })
        .catch(() => {
          // Ignore errors
        });
    },
    onHide: () => {
      // Send message to content-ui to hide reading mode
      chrome.runtime
        .sendMessage({
          action: 'readingModeHide',
          target: 'content-ui',
        })
        .catch(() => {
          // Ignore errors
        });
    },
  });
} catch (error) {
  // Silently handle initialization errors
}

// Handle messages from background script
chrome.runtime.onMessage.addListener(
  (
    message: {
      action: string;
      data?: unknown;
      target?: string;
      state?: {
        isActive?: boolean;
        widgetSize?: 'small' | 'medium' | 'large';
        rewriterOptions?: unknown;
      };
      original?: string;
      replacement?: string;
      options?: unknown;
    },
    sender,
    sendResponse,
  ) => {
    // Ignore messages intended for content-ui (let content-ui handle them)
    if (message.target === 'content-ui') {
      return false;
    }
    // Ignore messages targeted to offscreen (database operations)
    if (message.target === 'offscreen') {
      return false;
    }

    // Only handle messages targeted to content or with no target (backward compatibility)
    // Messages with other explicit targets should be handled by their respective handlers
    if (message.target && message.target !== 'content') {
      return false;
    }

    if (message.action === 'ping') {
      // Respond to ping to confirm content script is loaded
      sendResponse({ success: true, message: 'Content script loaded' });
      return true;
    } else if (message.action === 'scanAllRewritesAvailability') {
      try {
        const { rewrites } = message.data as {
          rewrites: Array<{ id: number; originalText: string; rewrittenText: string; url: string }>;
        };
        const results = scanAllRewritesAvailabilityOnPage(rewrites);
        sendResponse({ success: true, data: results });
      } catch (error) {
        console.error('Failed to scan all rewrites availability:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return true; // Keep channel open for async
    } else if (message.action === 'checkTextAvailability') {
      try {
        const { originalText, rewrittenText } = message.data as { originalText: string; rewrittenText: string };
        const available = checkTextAvailabilityOnPage(originalText, rewrittenText);
        sendResponse({ success: true, data: { available } });
      } catch (error) {
        console.error('Failed to check text availability:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return true;
    } else if (message.action === 'scrollToText') {
      try {
        const { textFragment, originalText, rewrittenText } = message.data as {
          textFragment: string | null;
          originalText: string;
          rewrittenText: string;
        };
        scrollToTextOnPage(textFragment, originalText, rewrittenText);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Failed to scroll to text:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return true;
    } else if (message.action === 'openReadingMode') {
      // Handle reading mode opening
      (async () => {
        try {
          console.log('[CEB] Received openReadingMode message:', message);
          console.log('[CEB] Text annotate manager available:', !!textAnnotateManager);
          // Check if callbacks are set (access private property via any cast for debugging)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('[CEB] UI callbacks check:', (textAnnotateManager as any)?.uiCallbacks ? 'SET' : 'NOT SET');

          if (!textAnnotateManager) {
            console.error('[CEB] Text annotate manager not available, showing fallback');
            sendResponse({ success: false, message: 'Text annotate manager not available' });
            return;
          }

          const data = (message.data as { mode?: string; useFullContent?: boolean; selector?: string }) || {};
          const mode = data.mode || 'auto';
          const url = window.location.href;

          console.log('[CEB] Opening reading mode with mode:', mode, 'data:', data);

          if (mode === 'auto') {
            const useFullContent = data.useFullContent !== false;
            console.log('[CEB] Calling openReadingModeAuto with useFullContent:', useFullContent);
            await textAnnotateManager.openReadingModeAuto(document, url, useFullContent);
          } else if (mode === 'manual') {
            console.log('[CEB] Calling openReadingModeManual');
            await textAnnotateManager.openReadingModeManual(document);
          } else if (mode === 'selector' && data.selector) {
            console.log('[CEB] Calling openReadingModeSelector with selector:', data.selector);
            await textAnnotateManager.openReadingModeSelector(document, data.selector);
          } else {
            throw new Error(`Invalid mode: ${mode}`);
          }

          console.log('[CEB] Reading mode opened successfully');
          sendResponse({ success: true });
        } catch (error) {
          console.error('[CEB] Failed to open reading mode:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      return true; // Keep channel open for async
    } else if (message.action === 'closeReadingMode') {
      try {
        if (textAnnotateManager) {
          textAnnotateManager.closeReadingMode();
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return true;
    } else if (message.action === 'rewriteSelectedText') {
      // Handle rewriteSelectedText via WordReplacer
      (async () => {
        try {
          if (!wordReplacer) {
            sendResponse({
              success: false,
              error: 'WordReplacer not initialized',
            });
            return;
          }

          const result = await wordReplacer.rewriteSelectedText();
          sendResponse({ success: true, ...result });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      return true; // Keep channel open for async
    } else if (message.action === 'updateState') {
      // Handle state updates via WordReplacer
      (async () => {
        try {
          if (!wordReplacer) {
            sendResponse({ success: false, error: 'WordReplacer not initialized' });
            return;
          }

          const state = message.state as {
            isActive?: boolean;
            widgetSize?: 'small' | 'medium' | 'large';
            rewriterOptions?: unknown;
          };
          await wordReplacer.updateState(state as Parameters<typeof wordReplacer.updateState>[0]);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      return true; // Keep channel open for async
    } else if (message.action === 'addReplacement') {
      // Handle addReplacement via WordReplacer
      (async () => {
        try {
          if (!wordReplacer) {
            sendResponse({ success: false, error: 'WordReplacer not initialized' });
            return;
          }

          await wordReplacer.addReplacement(message.original as string, message.replacement as string);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      return true; // Keep channel open for async
    } else if (message.action === 'removeReplacement') {
      // Handle removeReplacement via WordReplacer
      (async () => {
        try {
          if (!wordReplacer) {
            sendResponse({ success: false, error: 'WordReplacer not initialized' });
            return;
          }

          await wordReplacer.removeReplacement(message.original as string);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      return true; // Keep channel open for async
    } else if (message.action === 'getState') {
      // Handle getState via WordReplacer
      try {
        if (!wordReplacer) {
          sendResponse({ success: false, error: 'WordReplacer not initialized' });
          return false;
        }

        const state = wordReplacer.getState();
        sendResponse({ success: true, state });
        return true;
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return true;
      }
    } else if (message.action === 'checkRewriterAvailability') {
      // Handle checkRewriterAvailability via WordReplacer
      (async () => {
        try {
          if (!wordReplacer) {
            sendResponse({ success: false, error: 'WordReplacer not initialized' });
            return;
          }

          const result = await wordReplacer.checkRewriterAvailability();
          sendResponse({ success: true, ...result });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      return true; // Keep channel open for async
    } else if (message.action === 'updateRewriterOptions') {
      // Handle updateRewriterOptions via WordReplacer
      (async () => {
        try {
          if (!wordReplacer) {
            sendResponse({ success: false, error: 'WordReplacer not initialized' });
            return;
          }

          await wordReplacer.updateRewriterOptions(message.options as Partial<unknown>);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      return true; // Keep channel open for async
    } else if (message.action === 'getRewriterOptions') {
      // Handle getRewriterOptions via WordReplacer
      try {
        if (!wordReplacer) {
          sendResponse({ success: false, error: 'WordReplacer not initialized' });
          return false;
        }

        const options = wordReplacer.getRewriterOptions();
        sendResponse({ success: true, options });
        return true;
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return true;
      }
    } else if (message.action === 'undoAllRewrites') {
      // Handle undoAllRewrites via WordReplacer
      try {
        if (!wordReplacer) {
          sendResponse({ success: false, error: 'WordReplacer not initialized' });
          return false;
        }

        const stats = wordReplacer.undoAllRewrites();
        sendResponse({ success: true, ...stats });
        return true;
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return true;
      }
    }

    // Unknown action - don't respond (but allow other listeners to handle it)
    return false;
  },
);

// Function to scan all rewrites for availability on the main page
const scanAllRewritesAvailabilityOnPage = (
  rewrites: Array<{ id: number; originalText: string; rewrittenText: string; url: string }>,
): Array<{ id: number; status: 'rewritten' | 'original' | 'none' }> => {
  const pageText = document.body.innerText || document.body.textContent || '';
  const results: Array<{ id: number; status: 'rewritten' | 'original' | 'none' }> = [];

  for (const rewrite of rewrites) {
    const originalTextFound = pageText.includes(rewrite.originalText.trim());
    const rewrittenTextFound = pageText.includes(rewrite.rewrittenText.trim());

    let status: 'rewritten' | 'original' | 'none';
    if (rewrittenTextFound) {
      status = 'rewritten';
    } else if (originalTextFound) {
      status = 'original';
    } else {
      status = 'none';
    }

    results.push({ id: rewrite.id, status });
  }

  return results;
};

// Function to check text availability on the main page
const checkTextAvailabilityOnPage = (originalText: string, rewrittenText: string): boolean => {
  const pageText = document.body.innerText || document.body.textContent || '';
  const originalTextFound = pageText.includes(originalText.trim());
  const rewrittenTextFound = pageText.includes(rewrittenText.trim());
  return originalTextFound || rewrittenTextFound;
};

// Function to scroll to text on the main page using text fragments API
const scrollToTextOnPage = (textFragment: string | null, originalText: string, rewrittenText: string) => {
  try {
    // If we have a text fragment, use it to scroll to the original text
    if (textFragment) {
      const result = scrollToText(textFragment, {
        highlight: true,
        highlightDuration: 2000,
      });

      if (result.found) {
        return;
      }
    }

    // Fallback: try to find and scroll to the rewritten text first, then original text
    const pageText = document.body.innerText || document.body.textContent || '';
    const rewrittenTextFound = pageText.includes(rewrittenText.trim());
    const originalTextFound = pageText.includes(originalText.trim());

    // Choose which text to scroll to (prioritize rewritten if available, then original)
    const textToFind = rewrittenTextFound ? rewrittenText : originalText;

    if (!rewrittenTextFound && !originalTextFound) {
      return;
    }

    // Find the text element on the page
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);

    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.includes(textToFind.trim())) {
        // Found the text, scroll to it
        const element = node.parentElement;
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });

          return;
        }
      }
    }
  } catch (error) {
    console.error('Failed to scroll to text:', error);
  }
};
