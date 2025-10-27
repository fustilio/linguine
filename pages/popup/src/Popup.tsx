import '@src/Popup.css';
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
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';

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
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p>
          Edit <code>pages/popup/src/Popup.tsx</code>
        </p>
        <button
          className={cn(
            'mt-4 rounded px-4 py-1 font-bold shadow hover:scale-105',
            isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white',
          )}
          onClick={injectContentScript}>
          {t('injectButton')}
        </button>
        <ToggleButton>{t('toggleTheme')}</ToggleButton>
      </header>

      <div className="header">
        <h1>Plainly</h1>
        <p>Rephrase highlighted text into simpler, more understandable language.</p>
      </div>

      <div className="container">
        {/* <!-- Status Section --> */}
        <div className="section">
          <div id="status" className="status inactive">
            Extension is inactive
          </div>

          <div className="toggle-container">
            <span>Enable Extension</span>
            <div id="toggleSwitch" className="toggle-switch"></div>
          </div>
        </div>

        {/* <!-- Instructions Section --> */}
        <div className="section">
          <h3>How to Use</h3>
          <div className="mode-description" style={{ marginTop: '8px', lineHeight: '1.6' }}>
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
            <span style={{ fontSize: '10px', opacity: 0.7 }}>
              Doesn't work? Plainly requires chrome://flags/#rewriter-api-for-gemini-nano to be enabled.
            </span>
          </div>
        </div>

        {/* <!-- AI Settings Section --> */}
        <div className="section">
          <div className="settings-section">
            <div className="collapsible-header" id="settingsHeader">
              <h3 style={{ margin: 0 }}>AI Rewriter Settings</h3>
              <span className="arrow">▶</span>
            </div>

            <div className="collapsible-content" id="settingsContent">
              <div style={{ marginTop: '12px' }}>
                {/* <!-- Shared Context --> */}
                <div className="form-group">
                  <label htmlFor="sharedContext">Context (Instructions for AI)</label>
                  <textarea
                    id="sharedContext"
                    placeholder="e.g., I am learning English. Use simpler vocabulary so I can understand this text."></textarea>
                </div>

                {/* <!-- Tone --> */}
                <div className="form-group">
                  <label htmlFor="tone">Tone</label>
                  <select id="tone">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="more-formal">More Formal</option>
                    <option value="more-casual">More Casual</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>

                {/* <!-- Format --> */}
                <div className="form-group">
                  <label htmlFor="format">Format</label>
                  <select id="format">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="plain-text">Plain Text</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>

                {/* <!-- Length --> */}
                <div className="form-group">
                  <label htmlFor="length">Length</label>
                  <select id="length">
                    <option value="as-is">As-is (keep original)</option>
                    <option value="shorter">Shorter</option>
                    <option value="longer">Longer</option>
                  </select>
                </div>

                <button id="saveSettings" className="btn" style={{ width: '100%', marginTop: '8px' }}>
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
