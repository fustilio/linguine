import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const tabs = [
    { id: 'settings', label: 'Settings' },
    { id: 'vocabulary-admin', label: 'Vocabulary Admin' },
    { id: 'vocabulary-analytics', label: 'Vocabulary Analytics' },
    { id: 'text-rewrites', label: 'Text Rewrites' },
  ];

  return (
    <div
      className={cn(
        'flex w-64 flex-col border-r',
        'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900',
      )}>
      <div className={cn('border-b p-4 border-gray-200 dark:border-gray-700')}>
        <h2 className={cn('text-xl font-bold text-gray-900 dark:text-gray-100')}>Options</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'w-full rounded-lg px-4 py-2 text-left transition-colors',
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
            )}>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
