import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTabId?: string;
}

export const Tabs = ({ tabs, defaultTabId }: TabsProps) => {
  // Find first non-disabled tab as fallback
  const getDefaultTab = () => {
    if (defaultTabId) {
      const defaultTab = tabs.find(tab => tab.id === defaultTabId && !tab.disabled);
      if (defaultTab) return defaultTabId;
    }
    return tabs.find(tab => !tab.disabled)?.id || tabs[0]?.id;
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab);

  const activeTabData = tabs.find(tab => tab.id === activeTab && !tab.disabled);

  return (
    <div className="flex h-full flex-col">
      {/* Tab Headers */}
      <div className="flex flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'px-6 py-3 text-sm font-medium transition-colors',
              tab.disabled && 'cursor-not-allowed opacity-50',
              activeTab === tab.id && !tab.disabled
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : !tab.disabled && 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-0 flex-1">{activeTabData?.content}</div>
    </div>
  );
};
