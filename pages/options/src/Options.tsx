import '@src/Options.css';
import { Sidebar } from './Sidebar';
import { VocabularyAdmin } from './VocabularyAdmin';
import { VocabularyAnalytics } from './VocabularyAnalytics';
import { TextRewritesAdmin } from './TextRewritesAdmin';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense, LANGUAGES } from '@extension/shared';
import { exampleThemeStorage, languageStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton, useURLParam } from '@extension/ui';
import { useState, useEffect } from 'react';

const Options = () => {
  const { nativeLanguage, targetLanguage } = useStorage(languageStorage);
  
  // Use URL parameter hook for tab management
  const [activeTab, setActiveTab] = useURLParam('tab', 'vocabulary-admin');

  // Validate tab and fallback to default if invalid
  const validTabs = ['settings', 'vocabulary-admin', 'vocabulary-analytics', 'text-rewrites'];
  const currentTab = validTabs.includes(activeTab) ? activeTab : 'vocabulary-admin';

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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
