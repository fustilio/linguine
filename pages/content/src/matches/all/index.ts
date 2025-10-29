import { WordReplacer, scrollToText } from '@extension/api';
import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

// Initialize the word replacer when the script loads
console.log('[CEB] Initializing word replacer');
const wordReplacer = WordReplacer.getInstance();
console.log('[CEB] Word replacer initialized');

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("received message", message);
  
      if (message.action === 'scanAllRewritesAvailability') {
        try {
          const { rewrites } = message.data;
          const results = scanAllRewritesAvailabilityOnPage(rewrites);
          sendResponse({ success: true, data: results });
        } catch (error) {
          console.error('Failed to scan all rewrites availability:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      } else if (message.action === 'checkTextAvailability') {
    try {
      const { originalText, rewrittenText } = message.data;
      const available = checkTextAvailabilityOnPage(originalText, rewrittenText);
      sendResponse({ success: true, data: { available } });
    } catch (error) {
      console.error('Failed to check text availability:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else if (message.action === 'scrollToText') {
    try {
      const { textFragment, originalText, rewrittenText } = message.data;
      scrollToTextOnPage(textFragment, originalText, rewrittenText);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to scroll to text:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
});

// Function to scan all rewrites for availability on the main page
function scanAllRewritesAvailabilityOnPage(rewrites: Array<{id: number, originalText: string, rewrittenText: string, url: string}>): Array<{id: number, status: 'rewritten' | 'original' | 'none'}> {
  const pageText = document.body.innerText || document.body.textContent || '';
  const results: Array<{id: number, status: 'rewritten' | 'original' | 'none'}> = [];
  
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
  
  console.log('[CEB] Scanned rewrites availability:', results);
  return results;
}

// Function to check text availability on the main page
function checkTextAvailabilityOnPage(originalText: string, rewrittenText: string): boolean {
  const pageText = document.body.innerText || document.body.textContent || '';
  const originalTextFound = pageText.includes(originalText.trim());
  const rewrittenTextFound = pageText.includes(rewrittenText.trim());
  return originalTextFound || rewrittenTextFound;
}


// Function to scroll to text on the main page using text fragments API
function scrollToTextOnPage(textFragment: string | null, originalText: string, rewrittenText: string) {
  try {
    // If we have a text fragment, use it to scroll to the original text
    if (textFragment) {
      // Parse the text fragment string into a TextFragment object
      
      console.log("textFragment", textFragment);

      const result = scrollToText(textFragment, {
        highlight: true,
        highlightDuration: 2000
      });

      if (result.found) {
        console.log('[CEB] Scrolled to text using fragment:', result.textNode?.textContent);
        return;
      } else {
        console.log('[CEB] Text fragment not found, falling back to text search');
      }
    }

    // Fallback: try to find and scroll to the rewritten text first, then original text
    const pageText = document.body.innerText || document.body.textContent || '';
    const rewrittenTextFound = pageText.includes(rewrittenText.trim());
    const originalTextFound = pageText.includes(originalText.trim());

    // Choose which text to scroll to (prioritize rewritten if available, then original)
    const textToFind = rewrittenTextFound ? rewrittenText : originalText;
    
    if (!rewrittenTextFound && !originalTextFound) {
      console.log('[CEB] Neither rewritten nor original text found on page');
      return;
    }

    // Find the text element on the page
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent && node.textContent.includes(textToFind.trim())) {
        // Found the text, scroll to it
        const element = node.parentElement;
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          // Simple scroll without highlighting for fallback
          // The polyfill handles highlighting when available

          console.log('[CEB] Scrolled to text (fallback):', textToFind);
          return;
        }
      }
    }

    console.log('[CEB] Text not found on page (fallback):', textToFind);
  } catch (error) {
    console.error('[CEB] Failed to scroll to text:', error);
  }
}
