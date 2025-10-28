import { cn } from '@/lib/utils';
import { cva } from 'cva';
import type { VocabularyItem } from '@extension/sqlite';

interface VocabularyFilterViewProps {
  items: VocabularyItem[];
  title?: string;
  emptyMessage?: string;
}

const levelBadge = cva({
  base: 'rounded-full px-3 py-1 text-xs font-medium',
  variants: {
    level: {
      struggling: ['bg-red-100', 'dark:bg-red-900', 'text-red-700', 'dark:text-red-200'],
      learning: ['bg-yellow-100', 'dark:bg-yellow-900', 'text-yellow-700', 'dark:text-yellow-200'],
      mastered: ['bg-green-100', 'dark:bg-green-900', 'text-green-700', 'dark:text-green-200'],
    },
  },
});

export const VocabularyFilterView = ({ items, title, emptyMessage }: VocabularyFilterViewProps) => {
  const getLevelLabel = (level: number) => {
    if (level <= 2) return 'struggling';
    if (level === 3) return 'learning';
    return 'mastered';
  };

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border p-8 text-center',
          'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        )}>
        <p className={cn('text-sm text-gray-500 dark:text-gray-400')}>
          {emptyMessage || 'No vocabulary found matching your criteria'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && <h4 className={cn('text-sm font-semibold text-gray-700 dark:text-gray-300')}>{title}</h4>}
      {items.map(item => (
        <div
          key={item.id}
          className={cn(
            'flex items-center gap-3 rounded border p-3',
            'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
          )}>
          <span className={levelBadge({ level: getLevelLabel(item.knowledge_level) })}>
            {getLevelLabel(item.knowledge_level).charAt(0).toUpperCase() + getLevelLabel(item.knowledge_level).slice(1)}
          </span>
          <span className={cn('flex-1 font-medium text-gray-900 dark:text-gray-100')}>{item.text}</span>
          <span className={cn('text-sm text-gray-500 dark:text-gray-400')}>{item.language}</span>
        </div>
      ))}
    </div>
  );
};
