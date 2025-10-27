import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// Word Replacer Background Script (Service Worker)
// Handles extension lifecycle and message passing

chrome.runtime.onInstalled.addListener(() => {
  console.log('Word Replacer extension installed');

  // Initialize default settings
  chrome.storage.sync.get(['wordReplacer'], result => {
    if (!result.wordReplacer) {
      const defaultSettings = {
        isActive: false,
        mode: 'replace',
        highlightColor: '#fbbf24',
        replacements: [],
      };

      chrome.storage.sync.set({ wordReplacer: defaultSettings });
    }
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

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
      return true; // Keep the message channel open

    case 'importSettings':
      // This would be handled by the popup reading a file
      sendResponse({
        success: false,
        error: 'Import should be handled by popup',
      });
      break;

    default:
      // Forward other messages to content script
      if (sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, message, sendResponse);
        return true; // Keep the message channel open
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
  }

  return false;
});

// Handle extension icon click
chrome.action.onClicked.addListener(tab => {
  // Open popup (this is handled automatically by manifest.json)
  console.log('Extension icon clicked on tab:', tab.id);
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

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.wordReplacer) {
    console.log('Word Replacer settings changed:', changes.wordReplacer);

    // Notify all tabs about the settings change
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: 'settingsChanged',
              settings: changes.wordReplacer.newValue,
            })
            .catch(() => {
              // Ignore errors for tabs without content script
            });
        }
      });
    });
  }
});
