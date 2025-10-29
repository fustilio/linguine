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
        try {
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('❌ Error forwarding database message:', errorMessage);
          
          // Check if this is an extension context invalidation error
          if (errorMessage.includes('Extension context invalidated') || 
              errorMessage.includes('Receiving end does not exist') ||
              errorMessage.includes('Could not establish connection')) {
            sendResponse({ 
              success: false, 
              error: 'Extension context invalidated. Please reload the extension or refresh the page.' 
            });
          } else {
            sendResponse({ 
              success: false, 
              error: errorMessage 
            });
          }
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

          case 'scanAllRewritesAvailability':
            // Forward bulk text availability scan to content script on the current tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'scanAllRewritesAvailability',
                  data: message.data
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('Failed to send bulk text availability scan to content script:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    sendResponse(response || { success: true, data: [] });
                  }
                });
              } else {
                sendResponse({ success: false, error: 'No active tab found' });
              }
            });
            return; // Keep the message channel open

          case 'checkTextAvailability':
            // Forward text availability check to content script on the current tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'checkTextAvailability',
                  data: message.data
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('Failed to send text availability check to content script:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    sendResponse(response || { success: true, data: { available: false } });
                  }
                });
              } else {
                sendResponse({ success: false, error: 'No active tab found' });
              }
            });
            return; // Keep the message channel open

          case 'scrollToText':
            // Forward scroll request to content script on the current tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'scrollToText',
                  data: message.data
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('Failed to send scroll message to content script:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    sendResponse(response || { success: true });
                  }
                });
              } else {
                sendResponse({ success: false, error: 'No active tab found' });
              }
            });
            return; // Keep the message channel open

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

// Handle tab activation to refresh sidebar data
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    // Only refresh for web pages
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      // Send message to side panel to refresh data for the new tab
      chrome.runtime.sendMessage({
        action: 'tabChanged',
        data: {
          tabId: activeInfo.tabId,
          url: tab.url,
          title: tab.title
        }
      }).catch(error => {
        // Side panel might not be open, that's okay
        console.log('Side panel not available for tab change notification:', error);
      });
    }
  } catch (error) {
    console.error('Failed to handle tab activation:', error);
  }
});

