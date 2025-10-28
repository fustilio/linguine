import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  isLight: boolean;
  defaultTabId?: string;
}

export const Tabs = ({ tabs, isLight, defaultTabId }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTabId || tabs[0]?.id);

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="flex h-full flex-col">
      {/* Tab Headers */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: isLight ? '#e5e7eb' : '#374151' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-6 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? isLight
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'border-b-2 border-blue-400 text-blue-400'
                : isLight
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 hover:text-gray-100',
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
