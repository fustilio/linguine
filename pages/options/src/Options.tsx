import '@src/Options.css';
import { Sidebar } from './Sidebar';
import { VocabularyAdmin } from './VocabularyAdmin';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton, VocabularyAnalytics } from '@extension/ui';
import { useState } from 'react';

const Options = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const [activeTab, setActiveTab] = useState('vocabulary-admin');
  const logo = isLight ? 'options/logo_horizontal.svg' : 'options/logo_horizontal_dark.svg';

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  return (
    <div className={cn('App', isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100')}>
      <div className="flex h-screen">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className={cn('flex-shrink-0 border-b p-4', isLight ? 'border-gray-200' : 'border-gray-700')}>
            <div className="flex items-center justify-between">
              <button onClick={goGithubSite}>
                <img src={chrome.runtime.getURL(logo)} className="h-8" alt="logo" />
              </button>
              <div className="flex items-center gap-4">
                <p className="text-sm">
                  Edit <code className="text-xs">pages/options/src/Options.tsx</code>
                </p>
                <ToggleButton onClick={exampleThemeStorage.toggle}>{t('toggleTheme')}</ToggleButton>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-6">
            {activeTab === 'vocabulary-admin' && <VocabularyAdmin />}
            {activeTab === 'vocabulary-analytics' && <VocabularyAnalytics isLight={isLight} />}
            {activeTab === 'settings' && (
              <div className={cn(isLight ? 'text-gray-700' : 'text-gray-300')}>
                <h2 className="mb-4 text-2xl font-bold">Settings</h2>
                <p>Settings content goes here...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
