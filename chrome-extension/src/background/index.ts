import 'webextension-polyfill';
import { queryWikimediaAPI, extractImageUrls } from '@extension/api';

// Offscreen document lifecycle management
let creating: Promise<void> | null = null; // Global promise to avoid concurrency issues

const setupOffscreenDocument = async (path: string): Promise<void> => {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
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
      reasons: ['WORKERS', 'LOCAL_STORAGE'],
      justification: 'Access OPFS for SQLite database operations',
    });
    await creating;
    creating = null;
    console.log('✅ Offscreen document created');
  }
};

// Initialize offscreen document on startup
const initializeOffscreenDocument = async (): Promise<void> => {
  await setupOffscreenDocument('offscreen.html');
  console.log('✅ Offscreen document initialized');
};

// Initialize on startup
initializeOffscreenDocument().catch(error => {
  console.error('❌ Failed to initialize offscreen document:', error);
});

// Word Replacer Background Script (Service Worker)
// Handles extension lifecycle and message passing

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ignore messages not intended for background
  if (message.target && message.target !== 'background' && message.target !== 'offscreen') {
    return false;
  }

  // Ignore database operations (they go directly to offscreen)
  if (message.target === 'offscreen' && message.action !== 'ensureOffscreenDocument') {
    return false;
  }

  // Handle ensureOffscreenDocument action
  if (message.action === 'ensureOffscreenDocument') {
    (async () => {
      try {
        await setupOffscreenDocument('offscreen.html');
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error ensuring offscreen document:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true;
  }

  // Handle messages that use async Chrome APIs with callbacks
  try {
    switch (message.action) {
      case 'fetchWikimediaImages': {
        (async () => {
          try {
            const { query, limit = 3 } = message.data || {};
            console.log(`[BG] fetchWikimediaImages query: "${String(query)}" limit: ${limit}`);
            if (!query || typeof query !== 'string') {
              console.warn('[BG] fetchWikimediaImages: empty or invalid query');
              sendResponse({ success: true, data: [] });
              return;
            }
            const apiRes = await queryWikimediaAPI({ query, limit });
            const urls = Array.from(new Set(extractImageUrls(apiRes).filter(Boolean)));
            console.log('[BG] fetchWikimediaImages urls:', urls, 'for query:', String(query));
            sendResponse({ success: true, data: urls });
          } catch (err) {
            console.error('Failed fetching Wikimedia images for query:', String((message.data || {}).query), err);
            sendResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
          }
        })();
        return true;
      }
      case 'wordSelected':
        sendResponse({ success: true });
        return false;

      case 'getTabId':
        // Return the current tab ID (synchronous)
        if (sender.tab) {
          sendResponse({ success: true, tabId: sender.tab.id });
        } else {
          sendResponse({ success: false, error: 'No tab ID available' });
        }
        return false; // Synchronous response, close channel

      case 'ping':
        // Health check (synchronous)
        sendResponse({ success: true, pong: true });
        return false; // Synchronous response, close channel

      case 'scanAllRewritesAvailability':
        // Forward bulk text availability scan to content script (async callback)
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                action: 'scanAllRewritesAvailability',
                data: message.data,
              },
              response => {
                if (chrome.runtime.lastError) {
                  console.error(
                    'Failed to send bulk text availability scan to content script:',
                    chrome.runtime.lastError,
                  );
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  sendResponse(response || { success: true, data: [] });
                }
              },
            );
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true; // Keep channel open for async callback

      case 'checkTextAvailability':
        // Forward text availability check to content script (async callback)
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                action: 'checkTextAvailability',
                data: message.data,
              },
              response => {
                if (chrome.runtime.lastError) {
                  console.error('Failed to send text availability check to content script:', chrome.runtime.lastError);
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  sendResponse(response || { success: true, data: { available: false } });
                }
              },
            );
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true; // Keep channel open for async callback

      case 'scrollToText':
        // Forward scroll request to content script (async callback)
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                action: 'scrollToText',
                data: message.data,
              },
              response => {
                if (chrome.runtime.lastError) {
                  console.error('Failed to send scroll message to content script:', chrome.runtime.lastError);
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  sendResponse(response || { success: true });
                }
              },
            );
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true; // Keep channel open for async callback

      case 'rewriteAccepted':
        if (message.target === 'sidepanel') {
          chrome.runtime.sendMessage(message).catch(() => {
            // Side panel might not be open, that's okay
          });
        }
        sendResponse({ success: true });
        return false;

      case 'exportSettings':
        // Export settings to JSON file (async callback)
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
        return true; // Keep channel open for async callback

      case 'importSettings':
        // This would be handled by the popup reading a file (synchronous)
        sendResponse({
          success: false,
          error: 'Import should be handled by popup',
        });
        return false; // Synchronous response, close channel

      default:
        // Forward other messages to content script (async)
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, message, sendResponse);
          return true; // Keep channel open for async callback
        } else {
          sendResponse({ success: false, error: 'No active tab' });
          return false; // Synchronous response, close channel
        }
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false; // Synchronous error response, close channel
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  // Register selection-only context menu for Reading Mode
  try {
    chrome.contextMenus.remove('read_with_linguine', () => {
      // Ignore errors on remove; we'll create fresh below
      chrome.contextMenus.create({
        id: 'read_with_linguine',
        title: 'Read with Linguine',
        contexts: ['selection'],
      });
    });
  } catch {
    // Fallback: create without remove if remove throws synchronously
    chrome.contextMenus.create({
      id: 'read_with_linguine',
      title: 'Read with Linguine',
      contexts: ['selection'],
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'read_with_linguine' || !tab?.id) return;

  try {
    // Try sending to existing content script first
    await chrome.tabs.sendMessage(tab.id, { action: 'openReadingMode', data: { mode: 'manual' } });
  } catch {
    // If no content runtime, inject and retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-runtime/all.iife.js'],
      });
      await chrome.tabs.sendMessage(tab.id, { action: 'openReadingMode', data: { mode: 'manual' } });
    } catch (e) {
      console.error('Failed to open reading mode from context menu', e);
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async tab => {
  console.log('Extension icon clicked on tab:', tab.id);

  // Ensure offscreen document exists before any operations
  await setupOffscreenDocument('offscreen.html');

  // Send ping to offscreen document
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ping',
      target: 'offscreen',
      data: 'Extension icon clicked',
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
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, () => {
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
chrome.tabs.onActivated.addListener(async activeInfo => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // Only refresh for web pages
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      // Send message to side panel to refresh data for the new tab
      chrome.runtime
        .sendMessage({
          action: 'tabChanged',
          data: {
            tabId: activeInfo.tabId,
            url: tab.url,
            title: tab.title,
          },
        })
        .catch(() => {
          // Side panel might not be open, that's okay
        });
    }
  } catch (error) {
    console.error('Failed to handle tab activation:', error);
  }
});
