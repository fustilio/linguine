interface BulkActionsBarProps {
  selectedItemsCount: number;
  onLevelUp: () => void;
  onLevelDown: () => void;
  onDelete: () => void;
}

export const BulkActionsBar = ({ selectedItemsCount, onLevelUp, onLevelDown, onDelete }: BulkActionsBarProps) => (
  <div className="mb-4 flex items-center justify-between rounded bg-gray-700 p-2">
    <span className="text-white">{selectedItemsCount} items selected</span>
    <div className="flex gap-2">
      <button onClick={onLevelDown} className="rounded bg-yellow-500 px-3 py-1 text-white hover:bg-yellow-600">
        Level Down
      </button>
      <button onClick={onLevelUp} className="rounded bg-yellow-500 px-3 py-1 text-white hover:bg-yellow-600">
        Level Up
      </button>
      <button onClick={onDelete} className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600">
        Delete Selected
      </button>
    </div>
  </div>
);
