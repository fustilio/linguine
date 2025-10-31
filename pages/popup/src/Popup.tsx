import './Popup.css';

import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { wordReplacerStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, Switch, ThemeToggleIcon } from '@extension/ui';
import { useEffect, useState } from 'react';

// const notificationOptions = {
//   type: 'basic',
//   iconUrl: chrome.runtime.getURL('pasta-illustration-2.png'),
//   title: 'Injecting content script error',
//   message: 'You cannot inject script here!',
// } as const;

const Popup = () => {
  const logo = 'popup/pasta-illustration-2.svg';

  // Use storage hook for word replacer state
  const wordReplacerState = useStorage(wordReplacerStorage);

  // Local state for UI
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);

  // Get safe values with fallbacks
  const isActive = wordReplacerState?.isActive ?? false;
  const widgetSize = wordReplacerState?.widgetSize ?? 'small';

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        // Get current tab
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        setCurrentTab(tab);

        // Check if content script is loaded
        await checkContentScript(tab);
      } catch (error) {
        console.error('Error loading state:', error);
      }
    };

    void loadState();
  }, []);

  // Check if content script is loaded on the page
  const checkContentScript = async (tab: chrome.tabs.Tab) => {
    if (!tab?.id || !tab.url?.startsWith('http')) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch {
      // Content script not loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-runtime/index.iife.js'],
        });
      } catch (error) {
        console.error('Failed to inject content script:', error);
      }
    }
  };

  // Helper function to notify content script with updated state
  const notifyContentScriptWithUpdatedState = async (
    updatedState: Awaited<ReturnType<typeof wordReplacerStorage.get>>,
  ) => {
    if (currentTab?.id) {
      try {
        await chrome.tabs.sendMessage(currentTab.id, {
          action: 'updateState',
          state: {
            isActive: updatedState.isActive,
            widgetSize: updatedState.widgetSize,
            rewriterOptions: updatedState.rewriterOptions,
          },
        });
      } catch (error) {
        console.error('Error sending message to content script:', error);
      }
    }
  };

  // Toggle extension active state
  const toggleActive = async () => {
    try {
      await wordReplacerStorage.toggleActive();

      // Get the updated state from storage after toggle
      const updatedState = await wordReplacerStorage.get();

      // Notify content script with updated state
      await notifyContentScriptWithUpdatedState(updatedState);
    } catch (error) {
      console.error('Failed to toggle active state:', error);
    }
  };

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  // const injectContentScript = async () => {
  //   const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

  //   if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
  //     chrome.notifications.create('inject-error', notificationOptions);
  //   }

  //   await chrome.scripting
  //     .executeScript({
  //       target: { tabId: tab.id! },
  //       files: ['/content-runtime/example.iife.js', '/content-runtime/all.iife.js'],
  //     })
  //     .catch(err => {
  //       // Handling errors related to other paths
  //       if (err.message.includes('Cannot access a chrome:// URL')) {
  //         chrome.notifications.create('inject-error', notificationOptions);
  //       }
  //     });
  // };

  return (
    <div
      className={cn(
        'flex h-screen w-screen flex-col overflow-y-auto overflow-x-hidden text-sm',
        'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      )}>
      {/* Header with Logo and Title */}
      <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4 text-white">
        <div className="flex items-center gap-2">
          <button onClick={goGithubSite} className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0">
            <img
              src={chrome.runtime.getURL(logo)}
              className="h-10 w-10 rounded-lg transition-transform hover:scale-110"
              alt="Linguine logo"
            />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">Linguine</h1>
            <p className="text-[11px] leading-tight opacity-90">
              Rephrase highlighted text into simpler, more understandable language, just like untangling a bowl of
              linguine.
            </p>
          </div>
        </div>
      </div>

      {/* Compact Icon Settings Row */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-center gap-4">
          {/* Extension Toggle Switch */}
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={() => toggleActive()} size="md" aria-label="Toggle extension" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{isActive ? 'On' : 'Off'}</span>
          </div>

          {/* Widget Size Group */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
            {[
              { value: 'small', label: 'S' },
              { value: 'medium', label: 'M' },
              { value: 'large', label: 'L' },
            ].map(option => (
              <button
                key={option.value}
                onClick={async () => {
                  const newSize = option.value as 'small' | 'medium' | 'large';
                  await wordReplacerStorage.updateWidgetSize(newSize);

                  // Get the updated state from storage
                  const updatedState = await wordReplacerStorage.get();

                  // Notify content script with updated state
                  await notifyContentScriptWithUpdatedState(updatedState);
                }}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded text-xs font-semibold transition-all',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  widgetSize === option.value
                    ? 'bg-[#667eea] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300',
                )}
                title={`Widget Size: ${option.label}`}>
                {option.label}
              </button>
            ))}
          </div>

          {/* Theme Toggle Icon */}
          <ThemeToggleIcon size="md" />

          {/* Settings Button Icon */}
          <button
            onClick={openOptionsPage}
            aria-label="Open settings"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg border transition-all',
              'border-gray-300 bg-white text-gray-700 hover:scale-110 active:scale-95',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
            )}
            title="Open settings">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Status Section */}
        <div className="mb-5">
          <div
            className={cn(
              'mb-3 rounded border px-3 py-2 text-center text-xs',
              isActive
                ? 'border-[#c3e6cb] bg-[#d4edda] text-[#155724]'
                : 'border-[#f5c6cb] bg-[#f8d7da] text-[#721c24]',
            )}>
            {isActive ? 'Extension is active' : 'Extension is inactive'}
          </div>
        </div>

        {/* Instructions Section */}
        <div className="mb-5">
          <h3 className={cn('mb-2 text-sm font-semibold text-[#444] dark:text-gray-200')}>How to Use</h3>
          <div className={cn('mt-2 text-[13px] leading-relaxed text-[#555] dark:text-gray-300')}>
            <strong>1. Enable the extension</strong> using the icon above
            <br />
            <strong>2. Select text</strong> on any webpage
            <br />
            <strong>3. Click the widget</strong> to simplify it with AI
            <br />
            <br />
            <strong>Controls when viewing simplified text:</strong>
            <br />
            1. ⇄ Toggle between original or simplified text
            <br />
            2. ✓ Apply change
            <br />
            <br />
            <span className="text-[10px] opacity-70">
              Doesn't work? Linguine requires chrome://flags/#rewriter-api-for-gemini-nano to be enabled.
            </span>
          </div>
        </div>

        {/* Text Annotate Section */}
        <div className="mb-5">
          <h3 className={cn('mb-3 text-sm font-semibold text-[#444] dark:text-gray-200')}>Text Annotate</h3>
          <button
            onClick={async () => {
              if (!currentTab?.id) return;
              try {
                // Ensure content script is loaded first
                await checkContentScript(currentTab);

                // Wait a bit for content script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));

                const response = await chrome.tabs.sendMessage(currentTab.id, {
                  action: 'openReadingMode',
                  data: { mode: 'auto', useFullContent: true },
                });

                if (response?.success) {
                  console.log('Reading mode opened successfully');
                } else {
                  console.error('Failed to open reading mode:', response?.error);
                }
              } catch (error) {
                console.error('Failed to open reading mode:', error);
                // Try to inject content script again if message failed
                try {
                  await chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    files: ['content-runtime/index.iife.js'],
                  });
                  console.log('Content script re-injected, try again');
                } catch (injectError) {
                  console.error('Failed to re-inject content script:', injectError);
                }
              }
            }}
            className={cn(
              'w-full rounded-lg px-4 py-2.5 font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-700',
              'dark:bg-blue-700 dark:hover:bg-blue-600',
            )}>
            Open Reading Mode
          </button>
          <p className={cn('mt-2 text-[11px] leading-relaxed text-[#666] dark:text-gray-400')}>
            Extract page content and annotate with AI translations
          </p>
        </div>

        {/* Debug Section */}
        <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
          <h3 className={cn('mb-3 text-sm font-semibold text-[#444] dark:text-gray-200')}>🐛 Debug Tools</h3>
          <div className="space-y-3">
            <button
              onClick={async () => {
                if (!currentTab?.id) return;
                try {
                  // Ensure content script is loaded first
                  await checkContentScript(currentTab);

                  // Wait a bit for content script to initialize
                  await new Promise(resolve => setTimeout(resolve, 100));

                  const response = await chrome.tabs.sendMessage(currentTab.id, {
                    action: 'openReadingMode',
                    data: { mode: 'auto', useFullContent: false },
                  });

                  if (response?.success) {
                    console.log('Reading mode opened successfully');
                  } else {
                    console.error('Failed to open reading mode:', response?.error);
                  }
                } catch (error) {
                  console.error('Failed to open reading mode:', error);
                  // Try to inject content script again if message failed
                  try {
                    await chrome.scripting.executeScript({
                      target: { tabId: currentTab.id },
                      files: ['content-runtime/index.iife.js'],
                    });
                    console.log('Content script re-injected, try again');
                  } catch (injectError) {
                    console.error('Failed to re-inject content script:', injectError);
                  }
                }
              }}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 font-medium transition-colors',
                'bg-orange-500 text-white hover:bg-orange-600',
                'dark:bg-orange-600 dark:hover:bg-orange-500',
              )}>
              🧪 Test Reading Mode (Demo)
            </button>
            <p className={cn('text-[11px] leading-relaxed text-[#666] dark:text-gray-400')}>
              Tests text annotation with short Thai sample. Check console for timing logs.
            </p>
            <button
              onClick={async () => {
                if (!currentTab?.id) return;
                try {
                  await checkContentScript(currentTab);
                  await new Promise(resolve => setTimeout(resolve, 100));
                  const response = await chrome.tabs.sendMessage(currentTab.id, {
                    action: 'closeReadingMode',
                  });
                  if (response?.success) {
                    console.log('Reading mode closed');
                  } else {
                    console.error('Failed to close reading mode:', response?.error);
                  }
                } catch (error) {
                  console.error('Failed to close reading mode:', error);
                }
              }}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 font-medium transition-colors',
                'bg-gray-200 text-gray-800 hover:bg-gray-300',
                'dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
              )}>
              ✖ Close Reading Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
