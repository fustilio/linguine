import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// Offscreen document management
let offscreenDocument: boolean = false;

async function createOffscreenDocument() {
  if (offscreenDocument) {
    return; // Already exists
  }

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_SCRAPING'],
      justification: 'Access OPFS for SQLite database operations',
    });
    offscreenDocument = true;
    console.log('✅ Offscreen document created');
  } catch (error) {
    console.error('❌ Failed to create offscreen document:', error);
  }
}

async function ensureOffscreenDocument() {
  if (!offscreenDocument) {
    await createOffscreenDocument();
  }
}

async function main() {
  await ensureOffscreenDocument();
  console.log('offscreen document ensured');

  // console.log("ensuring database is initialized");
  // await ensureDatabaseInitialized();
  // console.log("database is initialized");

  // const vocab = await getAllVocabularyForSummary();
  // console.log("vocab", vocab);

  // const newVocab = await addVocabularyItem({
  //   text: "test",
  //   language: "en-US",
  // });
  // console.log("newVocab", newVocab);
}

console.log('starting main');
main().then(() => console.log('✅ Main function completed'));

// Word Replacer Background Script (Service Worker)
// Handles extension lifecycle and message passing

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // Handle async operations
  const handleAsyncMessage = async () => {
    try {
      // Ensure offscreen document exists
      await ensureOffscreenDocument();

      // Forward all database-related messages to offscreen document
      const response = await chrome.runtime.sendMessage(message);

      if (response.success) {
        sendResponse(response);
      } else {
        console.error('❌ Offscreen document error:', response.error);
        sendResponse({ success: false, error: response.error });
      }
    } catch (error) {
      console.error('❌ Error forwarding message to offscreen:', error);
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

// chrome.runtime.onInstalled.addListener(() => {
//   console.log('Word Replacer extension installed');

//   // Initialize default settings
//   chrome.storage.sync.get(['wordReplacer'], result => {
//     if (!result.wordReplacer) {
//       const defaultSettings = {
//         isActive: false,
//         mode: 'replace',
//         highlightColor: '#fbbf24',
//         replacements: [],
//       };

//       chrome.storage.sync.set({ wordReplacer: defaultSettings });
//     }
//   });
// });

// // Handle messages from popup and content scripts
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log('Background received message:', message);

//   // Handle async operations
//   const handleAsyncMessage = async () => {
//     switch (message.action) {
//       case 'wordSelected':
//         // Handle word selection from content script
//         console.log(`Word selected: "${message.original}" -> "${message.replacement}"`);
//         sendResponse({ success: true });
//         break;

//       case 'getTabId':
//         // Return the current tab ID
//         if (sender.tab) {
//           sendResponse({ success: true, tabId: sender.tab.id });
//         } else {
//           sendResponse({ success: false, error: 'No tab ID available' });
//         }
//         break;

//       case 'ping':
//         // Health check
//         sendResponse({ success: true, pong: true });
//         break;

//       case 'exportSettings':
//         // Export settings to JSON file
//         chrome.storage.sync.get(['wordReplacer'], result => {
//           const settings = result.wordReplacer || {};
//           const dataStr = JSON.stringify(settings, null, 2);
//           const blob = new Blob([dataStr], { type: 'application/json' });
//           const url = URL.createObjectURL(blob);

//           chrome.downloads.download(
//             {
//               url: url,
//               filename: 'word-replacer-settings.json',
//               saveAs: true,
//             },
//             downloadId => {
//               URL.revokeObjectURL(url);
//               sendResponse({ success: true, downloadId: downloadId });
//             },
//           );
//         });
//         return true; // Keep the message channel open

//       case 'importSettings':
//         // This would be handled by the popup reading a file
//         sendResponse({
//           success: false,
//           error: 'Import should be handled by popup',
//         });
//         break;

//       case 'addSentenceRewrite':
//         // Handle sentence rewrite via offscreen document
//         try {
//           await ensureOffscreenDocument();
//           console.log('ensuring database is initialized');
//           const rewriteData = message.rewriteData as {
//             original_text: string;
//             rewritten_text: string;
//             language: string;
//             rewriter_settings: string;
//             source_url: string;
//             url_fragment: string;
//           };

//           console.log('going to write data', rewriteData);

//           // Send message to offscreen document
//           const response = await chrome.runtime.sendMessage({
//             action: 'addSentenceRewrite',
//             data: rewriteData,
//           });

//           console.log("response from offscreen document", response);

//           if (response.success) {
//             console.log('✅ Sentence rewrite saved via offscreen document');
//             sendResponse({ success: true });
//           } else {
//             console.error('❌ Failed to save sentence rewrite:', response.error);
//             sendResponse({ success: false, error: response.error });
//           }
//         } catch (error) {
//           console.error('❌ Failed to save sentence rewrite:', error);
//           sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
//         }
//         break;

//       case 'getSentenceRewrites':
//         // Handle getting sentence rewrites via offscreen document
//         try {
//           await ensureOffscreenDocument();
//           const { page = 1, limit = 10, filters = {} } = message;

//           const response = await chrome.runtime.sendMessage({
//             action: 'getSentenceRewrites',
//             data: { page, limit, filters },
//           });

//           if (response.success) {
//             sendResponse({ success: true, data: response.data });
//           } else {
//             sendResponse({ success: false, error: response.error });
//           }
//         } catch (error) {
//           console.error('❌ Failed to get sentence rewrites:', error);
//           sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
//         }
//         break;

//       case 'deleteSentenceRewrite':
//         // Handle deleting a single sentence rewrite via offscreen document
//         try {
//           await ensureOffscreenDocument();

//           const response = await chrome.runtime.sendMessage({
//             action: 'deleteSentenceRewrite',
//             data: { id: message.id },
//           });

//           if (response.success) {
//             sendResponse({ success: true });
//           } else {
//             sendResponse({ success: false, error: response.error });
//           }
//         } catch (error) {
//           console.error('❌ Failed to delete sentence rewrite:', error);
//           sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
//         }
//         break;

//       case 'deleteSentenceRewrites':
//         // Handle deleting multiple sentence rewrites via offscreen document
//         try {
//           await ensureOffscreenDocument();

//           const response = await chrome.runtime.sendMessage({
//             action: 'deleteSentenceRewrites',
//             data: { ids: message.ids },
//           });

//           if (response.success) {
//             sendResponse({ success: true });
//           } else {
//             sendResponse({ success: false, error: response.error });
//           }
//         } catch (error) {
//           console.error('❌ Failed to delete sentence rewrites:', error);
//           sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
//         }
//         break;

//       case 'clearAllSentenceRewrites':
//         // Handle clearing all sentence rewrites via offscreen document
//         try {
//           await ensureOffscreenDocument();

//           const response = await chrome.runtime.sendMessage({
//             action: 'clearAllSentenceRewrites',
//             data: {},
//           });

//           if (response.success) {
//             sendResponse({ success: true });
//           } else {
//             sendResponse({ success: false, error: response.error });
//           }
//         } catch (error) {
//           console.error('❌ Failed to clear all sentence rewrites:', error);
//           sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
//         }
//         break;

//       default:
//         // Forward other messages to content script
//         if (sender.tab && sender.tab.id) {
//           chrome.tabs.sendMessage(sender.tab.id, message, sendResponse);
//           return true; // Keep the message channel open
//         } else {
//           sendResponse({ success: false, error: 'No active tab' });
//         }
//     }
//     return; // Explicit return for async function
//   };

//   // Execute async handler
//   handleAsyncMessage().catch(error => {
//     console.error('Error in message handler:', error);
//     sendResponse({ success: false, error: 'Internal error' });
//   });

//   return true; // Keep the message channel open for async operations
// });

// // Handle extension icon click
// chrome.action.onClicked.addListener(tab => {
//   // Open popup (this is handled automatically by manifest.json)
//   console.log('Extension icon clicked on tab:', tab.id);
// });

// // Handle tab updates to reinject content script if needed
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (
//     changeInfo.status === 'complete' &&
//     tab.url &&
//     (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
//   ) {
//     // Check if content script needs to be reinjected
//     chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
//       if (chrome.runtime.lastError) {
//         // Content script not loaded, inject it
//         chrome.scripting
//           .executeScript({
//             target: { tabId: tabId },
//             files: ['content.js'],
//           })
//           .catch(error => {
//             console.log('Could not inject content script:', error);
//           });
//       }
//     });
//   }
// });

// // Handle storage changes
// chrome.storage.onChanged.addListener((changes, namespace) => {
//   if (namespace === 'sync' && changes.wordReplacer) {
//     console.log('Word Replacer settings changed:', changes.wordReplacer);

//     // Notify all tabs about the settings change
//     chrome.tabs.query({}, tabs => {
//       tabs.forEach(tab => {
//         if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
//           chrome.tabs
//             .sendMessage(tab.id, {
//               action: 'settingsChanged',
//               settings: changes.wordReplacer.newValue,
//             })
//             .catch(() => {
//               // Ignore errors for tabs without content script
//             });
//         }
//       });
//     });
//   }
// });

// const menuId = 'addSentenceRewrite';

// async function manageContextMenuListener() {
//   console.log('existing contextg menus', await chrome.contextMenus.remove(menuId));
//   console.log('Background connected to someone, creating context menu');

//   if (!chrome.contextMenus) {
//     console.log('contextMenus is not supported in this browser');
//     return;
//   }

//   chrome.contextMenus.create({
//     id: menuId,
//     title: 'Add Sentence Rewrite',
//     type: 'normal',
//     contexts: ['selection'],
//   });

//   const listener = async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
//     console.log('Context menu clicked:', info, tab);
//     if (info.menuItemId === 'addSentenceRewrite') {
//       console.log('Add sentence rewrite clicked');
//       const selection = info.selectionText;
//       console.log('Selection:', selection);

//       try {
//         await ensureOffscreenDocument();

//         const rewriteData = {
//           original_text: selection,
//           rewritten_text: selection,
//           language: 'en-US',
//           rewriter_settings: JSON.stringify({
//             sharedContext: 'Context menu selection',
//             tone: 'as-is',
//             format: 'plain-text',
//             length: 'as-is',
//           }),
//           source_url: tab?.url || 'unknown',
//           url_fragment: '',
//         };

//         const response = await chrome.runtime.sendMessage({
//           action: 'addSentenceRewrite',
//           data: rewriteData,
//         });

//         if (response.success) {
//           console.log('✅ Sentence rewrite added via context menu');
//         } else {
//           console.error('❌ Failed to add sentence rewrite:', response.error);
//         }
//       } catch (error) {
//         console.error('❌ Error adding sentence rewrite:', error);
//       }
//     }
//   };

//   chrome.contextMenus.onClicked.addListener(listener);
// }

// chrome.runtime.onConnect.addListener(manageContextMenuListener);
