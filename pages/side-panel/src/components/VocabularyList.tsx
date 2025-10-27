import type { VocabularyItem } from '@extension/sqlite';
import { cn } from '@extension/ui';

interface VocabularyListProps {
  items: VocabularyItem[];
  selectedItems: Set<number>;
  isLight: boolean;
  onToggleSelectAll: () => void;
  onToggleItemSelected: (id: number) => void;
  onUpdateLevel: (id: number, level: number) => void;
  onDeleteItem: (id: number) => void;
}

export const VocabularyList = ({
  items,
  selectedItems,
  isLight,
  onToggleSelectAll,
  onToggleItemSelected,
  onUpdateLevel,
  onDeleteItem,
}: VocabularyListProps) => (
  <div className={cn('space-y-2', isLight ? 'text-gray-900' : 'text-gray-100')}>
    {/* Select All Checkbox */}
    <div className="flex items-center gap-2 p-2">
      <input type="checkbox" checked={selectedItems.size === items.length && items.length > 0} onChange={onToggleSelectAll} />
      <span>Select All</span>
    </div>

    {items.map(item => (
      <div
        key={item.id}
        className={cn(
          'flex items-center gap-2 rounded border p-2',
          isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900',
        )}>
        <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => onToggleItemSelected(item.id)} />
        <span className="flex-1 text-left">
          {item.text}{' '}
          <span className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>({item.language})</span>
        </span>
        <div className="flex items-center gap-2">
          <span>Level:</span>
          <button
            onClick={() => onUpdateLevel(item.id, item.knowledge_level - 1)}
            className={cn(
              'rounded px-2 py-1',
              isLight ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-gray-600 text-gray-100 hover:bg-gray-500',
            )}>
            -
          </button>
          <span className="w-4 text-center">{item.knowledge_level}</span>
          <button
            onClick={() => onUpdateLevel(item.id, item.knowledge_level + 1)}
            className={cn(
              'rounded px-2 py-1',
              isLight ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-gray-600 text-gray-100 hover:bg-gray-500',
            )}>
            +
          </button>
        </div>
        <button
          onClick={() => onDeleteItem(item.id)}
          className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600">
          Delete
        </button>
      </div>
    ))}
  </div>
);
