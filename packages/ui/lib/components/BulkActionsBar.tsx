import { button } from './common-styles';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedItemsCount: number;
  onLevelUp: () => void;
  onLevelDown: () => void;
  onDelete: () => void;
}

export const BulkActionsBar = ({ selectedItemsCount, onLevelUp, onLevelDown, onDelete }: BulkActionsBarProps) => (
  <div className={cn('mb-4 flex items-center justify-between rounded-lg p-3', 'bg-gray-100 dark:bg-gray-800')}>
    <span className="dark:text-white">{selectedItemsCount} items selected</span>
    <div className="flex gap-2">
      <button onClick={onLevelDown} className={button({ variant: 'warning', size: 'sm' })}>
        Level Down
      </button>
      <button onClick={onLevelUp} className={button({ variant: 'warning', size: 'sm' })}>
        Level Up
      </button>
      <button onClick={onDelete} className={button({ variant: 'danger', size: 'sm' })}>
        Delete Selected
      </button>
    </div>
  </div>
);
