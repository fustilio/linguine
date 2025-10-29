import './Popup.css';

import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { wordReplacerStorage, DEFAULT_REWRITER_OPTIONS, DEFAULT_REWRITER_PROMPT } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [saveStatus, setSaveStatus] = useState('');

  // Get safe values with fallbacks
  const isActive = wordReplacerState?.isActive ?? false;
  const widgetSize = wordReplacerState?.widgetSize ?? 'small';
  const rewriterOptions = wordReplacerState?.rewriterOptions ?? DEFAULT_REWRITER_OPTIONS;

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
  const notifyContentScriptWithUpdatedState = async (updatedState: {
    isActive: boolean;
    widgetSize: 'small' | 'medium' | 'large';
    rewriterOptions: {
      sharedContext: string;
      tone: string;
      format: string;
      length: string;
    };
  }) => {
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

  // Save rewriter options
  const handleSaveSettings = async () => {
    try {
      await wordReplacerStorage.updateRewriterOptions(rewriterOptions);

      // Get the updated state from storage
      const updatedState = await wordReplacerStorage.get();

      // Notify content script with updated state
      await notifyContentScriptWithUpdatedState(updatedState);

      // Show save confirmation
      setSaveStatus('✓ Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('✗ Save failed');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

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

      <div className="p-4">
        {/* Theme Toggle */}
        <div className="mb-6 flex justify-center">
          <ToggleButton>{t('toggleTheme')}</ToggleButton>
        </div>

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

          <div className="mb-3 flex items-center justify-between rounded-lg bg-[#f8f9fa] p-3 dark:bg-gray-700">
            <span className="text-black dark:text-gray-200">Enable Extension</span>
            <button
              onClick={toggleActive}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleActive();
                }
              }}
              aria-label="Toggle extension"
              aria-pressed={isActive}
              className={cn(
                'relative h-6 w-11 cursor-pointer rounded-full border-none transition-[background] duration-300',
                'after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white',
                "after:transition-transform after:duration-300 after:content-['']",
                isActive ? 'bg-[#4caf50] after:translate-x-5' : 'bg-[#ddd]',
              )}></button>
          </div>

          {/* <button
            className={cn(
              'w-full rounded px-4 py-2 font-semibold shadow transition-transform hover:scale-105',
              'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700',
            )}
            onClick={injectContentScript}>
            {t('injectButton')}
          </button> */}
        </div>

        {/* Widget Size Section */}
        <div className="mb-5">
          <h3 className={cn('mb-2 text-sm font-semibold text-[#444] dark:text-gray-200')}>Widget Size</h3>
          <div className="rounded-lg bg-[#f8f9fa] p-3 dark:bg-gray-700">
            <div className="flex gap-1">
              {[
                { value: 'small', label: 'Small', size: '50px' },
                { value: 'medium', label: 'Medium', size: '70px' },
                { value: 'large', label: 'Large', size: '90px' },
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
                    'flex-1 cursor-pointer rounded border px-3 py-2 text-xs font-medium transition-all duration-200',
                    widgetSize === option.value
                      ? 'border-[#667eea] bg-[#667eea] text-white shadow-sm'
                      : 'border-[#d1d5db] bg-white text-gray-700 hover:border-[#667eea] hover:bg-[#f0f4ff] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-[#667eea] dark:hover:bg-gray-700',
                  )}>
                  <div className="text-center font-semibold">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions Section */}
        <div className="mb-5">
          <h3 className={cn('mb-2 text-sm font-semibold text-[#444] dark:text-gray-200')}>How to Use</h3>
          <div className={cn('mt-2 text-[13px] leading-relaxed text-[#555] dark:text-gray-300')}>
            <strong>1. Enable the extension</strong> using the toggle above
            <br />
            <strong>2. Select text</strong> on any webpage
            <br />
            <strong>3. Click the highlighted text</strong> to simplify it with AI
            <br />
            <br />
            <strong>Controls when viewing simplified text:</strong>
            <br />
            1. ⇄ Toggle original/simplified
            <br />
            2. ✓ Apply toggle
            <br />
            3. 💾 Save sentence
            <br />
            <br />
            <span className="text-[10px] opacity-70">
              Doesn't work? Linguine requires chrome://flags/#rewriter-api-for-gemini-nano to be enabled.
            </span>
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="mb-5">
          <div className="mt-3 rounded-lg bg-[#f8f9fa] p-3 dark:bg-gray-700">
            <button
              className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent py-2 hover:opacity-80"
              onClick={() => setIsExpanded(!isExpanded)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
              aria-expanded={isExpanded}
              aria-controls="ai-settings-content">
              <h3 className="m-0 text-sm font-semibold text-[#444] dark:text-gray-200">AI Rewriter Settings</h3>
              <span className={cn('transition-transform duration-300', isExpanded && 'rotate-90')}>▶</span>
            </button>

            <div
              id="ai-settings-content"
              className={cn(
                'overflow-hidden transition-[max-height] duration-300 ease-in-out',
                isExpanded ? 'max-h-[600px]' : 'max-h-0',
              )}>
              <div className="mt-3">
                {/* Shared Context */}
                <div className="mb-3">
                  <label
                    htmlFor="sharedContext"
                    className="mb-1 block text-xs font-medium text-[#444] dark:text-gray-200">
                    Context (Instructions for AI)
                  </label>
                  <textarea
                    id="sharedContext"
                    value={rewriterOptions.sharedContext}
                    onChange={e =>
                      wordReplacerStorage.updateRewriterOptions({
                        sharedContext: e.target.value,
                      })
                    }
                    className="min-h-[60px] w-full resize-y rounded border border-[#d1d5db] bg-white p-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    placeholder={`e.g., ${DEFAULT_REWRITER_PROMPT}`}
                  />
                </div>

                {/* Tone */}
                <div className="mb-3">
                  <label htmlFor="tone" className="mb-1 block text-xs font-medium text-[#444] dark:text-gray-200">
                    Tone
                  </label>
                  <select
                    id="tone"
                    value={rewriterOptions.tone}
                    onChange={e =>
                      wordReplacerStorage.updateRewriterOptions({
                        tone: e.target.value,
                      })
                    }
                    className="w-full cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="more-formal">More Formal</option>
                    <option value="more-casual">More Casual</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>

                {/* Format */}
                <div className="mb-3">
                  <label htmlFor="format" className="mb-1 block text-xs font-medium text-[#444] dark:text-gray-200">
                    Format
                  </label>
                  <select
                    id="format"
                    value={rewriterOptions.format}
                    onChange={e =>
                      wordReplacerStorage.updateRewriterOptions({
                        format: e.target.value,
                      })
                    }
                    className="w-full cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="plain-text">Plain Text</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>

                {/* Length */}
                <div className="mb-3">
                  <label htmlFor="length" className="mb-1 block text-xs font-medium text-[#444] dark:text-gray-200">
                    Length
                  </label>
                  <select
                    id="length"
                    value={rewriterOptions.length}
                    onChange={e =>
                      wordReplacerStorage.updateRewriterOptions({
                        length: e.target.value,
                      })
                    }
                    className="w-full cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="shorter">Shorter</option>
                    <option value="longer">Longer</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="mt-2 w-full cursor-pointer rounded border-none bg-[#667eea] px-4 py-2 text-[13px] text-white transition-[background] duration-200 hover:bg-[#5a67d8] disabled:cursor-not-allowed disabled:bg-[#ccc] dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-gray-600">
                  {saveStatus || 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
