import '@src/Options.css';
import { Sidebar } from './Sidebar';
import { VocabularyAdmin } from './VocabularyAdmin';
import { VocabularyAnalytics } from './VocabularyAnalytics';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useState } from 'react';

const Options = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const [activeTab, setActiveTab] = useState('vocabulary-admin');

  return (
    <div className={cn('App', isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100')}>
      <div className="min-h-screen flex flex-row">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex flex-1 flex-col">
          {activeTab === 'vocabulary-admin' && <VocabularyAdmin />}
          {activeTab === 'vocabulary-analytics' && <VocabularyAnalytics isLight={isLight} />}
          {activeTab === 'settings' && (
            <div className={cn(isLight ? 'text-gray-700' : 'text-gray-300')}>
              <h2 className="mb-4 text-2xl font-bold">Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Theme</h3>
                  <ToggleButton>{t('toggleTheme')}</ToggleButton>
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
