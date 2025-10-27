import { PlainifyPopup } from './plainify-popup';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useEffect } from 'react';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  useEffect(() => {
    new PlainifyPopup();
  }, []);
  const { isLight } = useStorage(exampleThemeStorage);
  const logo = isLight ? 'popup/pasta-illustration-2.svg' : 'popup/logo_vertical_dark.svg';

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/example.iife.js', '/content-runtime/all.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  return (
    <div
      className={cn(
        'flex h-screen w-screen flex-col overflow-y-auto overflow-x-hidden text-sm',
        isLight ? 'bg-white text-gray-800' : 'bg-gray-800 text-gray-100',
      )}>
      {/* Header with Logo and Title */}
      <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button onClick={goGithubSite} className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0">
              <img
                src={chrome.runtime.getURL(logo)}
                className="h-10 w-10 rounded-lg transition-transform hover:scale-110"
                alt="Plainly logo"
              />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold">Plainly</h1>
              <p className="text-[10px] leading-tight opacity-90">
                Rephrase highlighted text into simpler, more understandable language.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ToggleButton>{t('toggleTheme')}</ToggleButton>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Status Section */}
        <div className="mb-5">
          <div className="mb-3 rounded border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-center text-xs text-[#721c24]">
            Extension is inactive
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg bg-[#f8f9fa] p-3">
            <span>Enable Extension</span>
            <div
              id="toggleSwitch"
              className="relative h-6 w-11 cursor-pointer rounded-full bg-[#ddd] transition-[background] duration-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:duration-300 after:content-['']"></div>
          </div>

          <button
            className={cn(
              'w-full rounded px-4 py-2 font-semibold shadow transition-transform hover:scale-105',
              isLight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
            onClick={injectContentScript}>
            {t('injectButton')}
          </button>
        </div>

        {/* Instructions Section */}
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-[#444]">How to Use</h3>
          <div className="mt-2 text-[13px] leading-relaxed text-[#555]">
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
              Doesn't work? Plainly requires chrome://flags/#rewriter-api-for-gemini-nano to be enabled.
            </span>
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="mb-5">
          <div className="mt-3 rounded-lg bg-[#f8f9fa] p-3">
            <div className="flex cursor-pointer items-center justify-between py-2 hover:opacity-80" id="settingsHeader">
              <h3 className="m-0 text-sm font-semibold text-[#444]">AI Rewriter Settings</h3>
              <span className="transition-transform duration-300">▶</span>
            </div>

            <div className="max-h-0 overflow-hidden transition-[max-height] duration-300 ease-in-out">
              <div className="mt-3">
                {/* Shared Context */}
                <div className="mb-3">
                  <label htmlFor="sharedContext" className="mb-1 block text-xs font-medium text-[#444]">
                    Context (Instructions for AI)
                  </label>
                  <textarea
                    id="sharedContext"
                    className="min-h-[60px] w-full resize-y rounded border border-[#d1d5db] p-2 text-xs"
                    placeholder="e.g., I am learning English. Use simpler vocabulary so I can understand this text."></textarea>
                </div>

                {/* Tone */}
                <div className="mb-3">
                  <label htmlFor="tone" className="mb-1 block text-xs font-medium text-[#444]">
                    Tone
                  </label>
                  <select className="w-full cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1.5 text-xs">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="more-formal">More Formal</option>
                    <option value="more-casual">More Casual</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>

                {/* Format */}
                <div className="mb-3">
                  <label htmlFor="format" className="mb-1 block text-xs font-medium text-[#444]">
                    Format
                  </label>
                  <select className="w-full cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1.5 text-xs">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="plain-text">Plain Text</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>

                {/* Length */}
                <div className="mb-3">
                  <label htmlFor="length" className="mb-1 block text-xs font-medium text-[#444]">
                    Length
                  </label>
                  <select className="w-full cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1.5 text-xs">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="shorter">Shorter</option>
                    <option value="longer">Longer</option>
                  </select>
                </div>

                <button
                  id="saveSettings"
                  className="mt-2 w-full cursor-pointer rounded border-none bg-[#667eea] px-4 py-2 text-[13px] text-white transition-[background] duration-200 hover:bg-[#5a67d8] disabled:cursor-not-allowed disabled:bg-[#ccc]">
                  Save Settings
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
