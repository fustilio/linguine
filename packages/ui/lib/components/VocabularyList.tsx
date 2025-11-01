import { cn } from '@/lib/utils';
import type { VocabularyItem } from '@extension/sqlite';
import { VocabularyCard } from './VocabularyCard';

interface VocabularyListProps {
  items: VocabularyItem[];
  selectedItems: Set<number>;
  onToggleSelectAll: () => void;
  onToggleItemSelected: (id: number) => void;
  onDeleteItem: (id: number) => void;
  onLearnAgain?: (id: number) => void;
  showMetadata?: boolean;
}

export const VocabularyList = ({
  items,
  selectedItems,
  onToggleSelectAll,
  onToggleItemSelected,
  onDeleteItem,
  onLearnAgain,
  showMetadata = false,
}: VocabularyListProps) => (
  <div className={cn('space-y-4 text-gray-900 dark:text-gray-100')}>
    {/* Select All Checkbox */}
    <div className="flex items-center gap-2 p-2">
      <input
        type="checkbox"
        checked={selectedItems.size === items.length && items.length > 0}
        onChange={onToggleSelectAll}
        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
    </div>

    {/* Card Grid */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => (
        <VocabularyCard
          key={item.id}
          item={item}
          isSelected={selectedItems.has(item.id)}
          onToggleSelect={onToggleItemSelected}
          onDelete={onDeleteItem}
          onLearnAgain={onLearnAgain}
          showCheckbox
          showMetadata={showMetadata}
        />
      ))}
    </div>

    {items.length === 0 && (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No vocabulary items yet. Add some to get started!</p>
      </div>
    )}
  </div>
);
