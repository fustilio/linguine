import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

// Initialize theme storage
exampleThemeStorage.get().then(theme => {
  console.log('Theme loaded:', theme);
});

// Offscreen document lifecycle management
let creating: Promise<void> | null = null; // Global promise to avoid concurrency issues

async function setupOffscreenDocument(path: string): Promise<void> {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    console.log('✅ Offscreen document already exists');
    return;
  }

  // Create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ["WORKERS", "LOCAL_STORAGE"],
      justification: 'Access OPFS for SQLite database operations',
    });
    await creating;
    creating = null;
    console.log('✅ Offscreen document created');
  }
}

// Initialize offscreen document on startup
async function initializeOffscreenDocument(): Promise<void> {
  await setupOffscreenDocument('offscreen.html');
  console.log('✅ Offscreen document initialized');
}

// Initialize on startup
initializeOffscreenDocument().catch(error => {
  console.error('❌ Failed to initialize offscreen document:', error);
});

// Word Replacer Background Script (Service Worker)
// Handles extension lifecycle and message passing

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Handle async operations
  const handleAsyncMessage = async (): Promise<void> => {
    try {
      // Check if this is a database-related message
      const databaseActions = [
        'getAllVocabularyForSummary',
        'addVocabularyItem',
        'deleteVocabularyItem',
        'deleteVocabularyItems',
        'updateVocabularyItemKnowledgeLevel',
        'updateVocabularyItemKnowledgeLevels',
        'getVocabulary',
        'getVocabularyCount',
        'resetVocabularyDatabase',
        'populateDummyVocabulary',
        'ensureDatabaseInitialized',
        'addTextRewrite',
        'getTextRewrites',
        'getTextRewriteCount',
        'deleteTextRewrite',
        'deleteTextRewrites',
        'clearAllTextRewrites',
        'getTextRewriteById',
        'getTextRewritesByLanguage',
        'getRecentTextRewrites',
        'getTextRewritesByUrl',
        'getTextRewritesByReadability',
        'getVocabularyWordsInText',
        'getTextRewritesContainingWord',
        'resetTextRewritesDatabase'
      ];

      if (databaseActions.includes(message.action)) {
        // Ensure offscreen document exists
        await setupOffscreenDocument('offscreen.html');

        // Forward database-related messages to offscreen document
        const response = await chrome.runtime.sendMessage(message);

        if (response && response.success) {
          sendResponse(response);
        } else {
          console.error('❌ Offscreen document error:', response?.error || 'No response');
          sendResponse({ success: false, error: response?.error || 'No response from offscreen document' });
        }
      } else {
        // Handle non-database messages
        switch (message.action) {
          case 'wordSelected':
            // Handle word selection from content script
            console.log(`Word selected: "${message.original}" -> "${message.replacement}"`);
            sendResponse({ success: true });
            break;

          case 'getTabId':
            // Return the current tab ID
            if (sender.tab) {
              sendResponse({ success: true, tabId: sender.tab.id });
            } else {
              sendResponse({ success: false, error: 'No tab ID available' });
            }
            break;

          case 'ping':
            // Health check
            sendResponse({ success: true, pong: true });
            break;

          case 'exportSettings':
            // Export settings to JSON file
            chrome.storage.sync.get(['wordReplacer'], result => {
              const settings = result.wordReplacer || {};
              const dataStr = JSON.stringify(settings, null, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);

              chrome.downloads.download(
                {
                  url: url,
                  filename: 'word-replacer-settings.json',
                  saveAs: true,
                },
                downloadId => {
                  URL.revokeObjectURL(url);
                  sendResponse({ success: true, downloadId: downloadId });
                },
              );
            });
            return; // Keep the message channel open

          case 'importSettings':
            // This would be handled by the popup reading a file
            sendResponse({
              success: false,
              error: 'Import should be handled by popup',
            });
            break;

          default:
            // Forward other messages to content script
            if (sender.tab && sender.tab.id) {
              chrome.tabs.sendMessage(sender.tab.id, message, sendResponse);
              return; // Keep the message channel open
            } else {
              sendResponse({ success: false, error: 'No active tab' });
            }
        }
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Execute async handler
  handleAsyncMessage().catch(error => {
    console.error('Error in message handler:', error);
    sendResponse({ success: false, error: 'Internal error' });
  });

  return true; // Keep the message channel open for async operations
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
  
  // Ensure offscreen document exists before any operations
  await setupOffscreenDocument('offscreen.html');
  
  // Send ping to offscreen document
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ping',
      target: 'offscreen',
      data: 'Extension icon clicked'
    });
    console.log('Offscreen response:', response);
  } catch (error) {
    console.error('Failed to communicate with offscreen document:', error);
  }
});

// Handle tab updates to reinject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
  ) {
    // Check if content script needs to be reinjected
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
      if (chrome.runtime.lastError) {
        // Content script not loaded, inject it
        chrome.scripting
          .executeScript({
            target: { tabId: tabId },
            files: ['content.js'],
          })
          .catch(error => {
            console.log('Could not inject content script:', error);
          });
      }
    });
  }
});

