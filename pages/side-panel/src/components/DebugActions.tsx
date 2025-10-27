import { cn } from '@extension/ui';

interface DebugActionsProps {
  populateDummyVocabulary: () => void;
  clearAllVocabulary: () => void;
  isLight: boolean;
}

export const DebugActions = ({ populateDummyVocabulary, clearAllVocabulary, isLight }: DebugActionsProps) => {
  const handleClear = () => {
    if (window.confirm('Are you sure you want to delete all vocabulary items?')) {
      clearAllVocabulary();
    }
  };

  return (
    <div className="my-4 flex justify-center gap-2">
      <button
        onClick={populateDummyVocabulary}
        className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
        Populate with Dummy Data
      </button>
      <button
        onClick={handleClear}
        className={cn(
          'rounded px-4 py-2 text-white',
          isLight ? 'bg-red-500 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700',
        )}>
        Clear All Data
      </button>
    </div>
  );
};
