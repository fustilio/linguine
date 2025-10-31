import { WordReplacer, scrollToText, TextAnnotateManager } from '@extension/api';
import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

// Initialize the word replacer when the script loads
console.log('[CEB] Initializing word replacer');
WordReplacer.getInstance();
console.log('[CEB] Word replacer initialized');

// Initialize text annotate manager
let textAnnotateManager: TextAnnotateManager | null = null;
try {
  textAnnotateManager = TextAnnotateManager.getInstance();
  console.log('[CEB] Text annotate manager initialized');
} catch (error) {
  console.error('[CEB] Failed to initialize text annotate manager:', error);
}

// Handle messages from background script
chrome.runtime.onMessage.addListener(
  (message: { action: string; data?: unknown; target?: string }, sender, sendResponse) => {
    // Ignore messages targeted to offscreen (database operations)
    if (message.target === 'offscreen') {
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

          if (!textAnnotateManager) {
            console.log('[CEB] Text annotate manager not available, showing fallback');
            sendResponse({ success: true, message: 'Message received but text annotate not available' });
            return;
          }

          const data = (message.data as { mode?: string; useFullContent?: boolean; selector?: string }) || {};
          const mode = data.mode || 'auto';
          const url = window.location.href;

          console.log('[CEB] Opening reading mode with mode:', mode);

          if (mode === 'auto') {
            const useFullContent = data.useFullContent !== false;
            await textAnnotateManager.openReadingModeAuto(document, url, useFullContent);
          } else if (mode === 'manual') {
            await textAnnotateManager.openReadingModeManual(document);
          } else if (mode === 'selector' && data.selector) {
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
        console.error('[CEB] Failed to close reading mode:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return true;
    }

    // Unknown action - don't respond
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
