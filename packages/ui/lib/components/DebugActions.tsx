import { button } from './common-styles';

interface DebugActionsProps {
  populateDummyVocabulary: () => void;
  clearAllVocabulary: () => void;
}

export const DebugActions = ({ populateDummyVocabulary, clearAllVocabulary }: DebugActionsProps) => {
  const handleClear = () => {
    if (window.confirm('Are you sure you want to delete all vocabulary items?')) {
      clearAllVocabulary();
    }
  };

  return (
    <div className="my-4 flex justify-center gap-2">
      <button onClick={populateDummyVocabulary} className={button({ variant: 'success' })}>
        Populate with Dummy Data
      </button>
      <button onClick={handleClear} className={button({ variant: 'danger' })}>
        Clear All Data
      </button>
    </div>
  );
};
