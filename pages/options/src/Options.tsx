import '@src/Options.css';
import { Sidebar } from './Sidebar';
import { VocabularyAdmin } from './VocabularyAdmin';
import { VocabularyAnalytics } from './VocabularyAnalytics';
import { TextRewritesAdmin } from './TextRewritesAdmin';
import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense, LANGUAGES } from '@extension/shared';
import { languageStorage, wordReplacerStorage, DEFAULT_REWRITER_OPTIONS, DEFAULT_REWRITER_PROMPT } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton, useURLParam } from '@extension/ui';
import { useState } from 'react';

const Options = () => {
  const { nativeLanguage, targetLanguage } = useStorage(languageStorage);
  const wordReplacerState = useStorage(wordReplacerStorage);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Use URL parameter hook for tab management
  const [activeTab, setActiveTab] = useURLParam('tab', 'vocabulary-admin');

  // Validate tab and fallback to default if invalid
  const validTabs = ['settings', 'vocabulary-admin', 'vocabulary-analytics', 'text-rewrites'];
  const currentTab = validTabs.includes(activeTab) ? activeTab : 'vocabulary-admin';

  // Get safe values with fallbacks
  const rewriterOptions = wordReplacerState?.rewriterOptions ?? DEFAULT_REWRITER_OPTIONS;

  // Save rewriter options
  const handleSaveSettings = async () => {
    try {
      await wordReplacerStorage.updateRewriterOptions(rewriterOptions);
      
      // Show save confirmation
      setSaveStatus('✓ Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('✗ Save failed');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  return (
    <div className={cn('App bg-slate-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100')}>
      <div className="min-h-screen flex flex-row">
        <Sidebar activeTab={currentTab} onTabChange={setActiveTab} />
        <div className="flex flex-1 flex-col">
          {currentTab === 'vocabulary-admin' && <VocabularyAdmin />}
          {currentTab === 'vocabulary-analytics' && <VocabularyAnalytics />}
          {currentTab === 'text-rewrites' && <TextRewritesAdmin />}
          {currentTab === 'settings' && (
            <div className={cn('text-gray-700 dark:text-gray-300')}>
              <h2 className="mb-4 text-2xl font-bold">Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Theme</h3>
                  <ToggleButton>{t('toggleTheme')}</ToggleButton>
                </div>
                
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Language Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Native Language
                      </label>
                      <select
                        value={nativeLanguage}
                        onChange={(e) => languageStorage.setNativeLanguage(e.target.value)}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2',
                          'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
                          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400'
                        )}
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Target Language
                      </label>
                      <select
                        value={targetLanguage}
                        onChange={(e) => languageStorage.setTargetLanguage(e.target.value)}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2',
                          'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
                          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400'
                        )}
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-semibold">AI Rewriter Settings</h3>
                  <div className="space-y-4">
                    {/* Shared Context */}
                    <div>
                      <label
                        htmlFor="sharedContext"
                        className="block mb-2 text-sm font-medium">
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
                        className={cn(
                          'min-h-[100px] w-full resize-y rounded-lg border px-3 py-2 text-sm transition-colors',
                          'border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500',
                          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400'
                        )}
                        placeholder={`e.g., ${DEFAULT_REWRITER_PROMPT}`}
                      />
                    </div>

                    {/* Tone */}
                    <div>
                      <label htmlFor="tone" className="block mb-2 text-sm font-medium">
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
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2',
                          'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
                          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400'
                        )}
                      >
                        <option value="as-is">As-is (keep original)</option>
                        <option value="more-formal">More Formal</option>
                        <option value="more-casual">More Casual</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>

                    {/* Format */}
                    <div>
                      <label htmlFor="format" className="block mb-2 text-sm font-medium">
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
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2',
                          'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
                          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400'
                        )}
                      >
                        <option value="as-is">As-is (keep original)</option>
                        <option value="plain-text">Plain Text</option>
                        <option value="markdown">Markdown</option>
                      </select>
                    </div>

                    {/* Length */}
                    <div>
                      <label htmlFor="length" className="block mb-2 text-sm font-medium">
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
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2',
                          'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
                          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400'
                        )}
                      >
                        <option value="as-is">As-is (keep original)</option>
                        <option value="shorter">Shorter</option>
                        <option value="longer">Longer</option>
                      </select>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      className={cn(
                        'rounded-lg border-none px-4 py-2 text-sm font-medium text-white transition-colors',
                        'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                        'dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400',
                        'disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600'
                      )}>
                      {saveStatus || 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
