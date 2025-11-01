import '@src/SidePanel.css';
import { Header } from './components/Header';
import { RewritesView } from './components/RewritesView';
import { SidePanelChatbot } from './components/SidePanelChatbot';
import VocabularyReviewView from './components/VocabularyReviewView';
import VocabularyView from './components/VocabularyView';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { Tabs, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';

const SidePanel = () => {
  const logo = 'side-panel/pasta-illustration-2.svg';
  const [currentUrl, setCurrentUrl] = useState<string>('');

  // Get current tab URL on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
      }
    });
  }, []);

  // Create tabs array
  const tabs = [
    {
      id: 'rewrites',
      label: '✏️ Rewrites',
      content: <RewritesView currentUrl={currentUrl} />,
    },
    {
      id: 'vocabulary',
      label: '📖 Vocabulary',
      content: <VocabularyView />,
    },
    {
      id: 'review',
      label: '📚 Review',
      content: <VocabularyReviewView />,
    },
    // {
    //   id: 'chatbot',
    //   label: '🤖 Chatbot',
    //   content: <SidePanelChatbot />,
    //   disabled: true,
    // },
  ];

  return (
    <div className="App h-screen bg-slate-50 dark:bg-gray-800">
      <div className="container mx-auto flex h-full flex-col p-4">
        {/* Header Section */}
        <div className="fade-in flex-shrink-0 border-b border-slate-200/60 bg-white/50 shadow-sm backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/50">
          <div className="container mx-auto px-6 py-3">
            <Header logo={logo} />
          </div>
        </div>
        <Tabs tabs={tabs} defaultTabId="rewrites" />
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
