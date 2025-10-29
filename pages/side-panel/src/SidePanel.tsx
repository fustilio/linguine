import '@src/SidePanel.css';
import { Header } from './components/Header';
import { Tabs } from '@extension/ui';
import { SidePanelChatbot } from './components/SidePanelChatbot';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';
import VocabularyView from './components/VocabularyView';
import { RewritesView } from './components/RewritesView';

const SidePanel = () => {
  const logo = 'side-panel/pasta-illustration-2.svg';
  const [currentUrl, setCurrentUrl] = useState<string>('');

  // Get current tab URL on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
      }
    });
  }, []);

  // Create tabs array
  const tabs = [
    {
      id: 'rewrites',
      label: 'Rewrites',
      content: <RewritesView currentUrl={currentUrl} />
    },
    {
      id: 'vocabulary',
      label: 'Vocabulary',
      content: <VocabularyView />
    },
    {
      id: 'chatbot',
      label: 'Chatbot',
      content: <SidePanelChatbot />
    }
  ];

  return (
    <div className="App bg-slate-50 dark:bg-gray-800 h-screen">
      <div className="container mx-auto p-4 h-full flex flex-col">
        <Header logo={logo} />
        <Tabs tabs={tabs} defaultTabId="rewrites" />
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
