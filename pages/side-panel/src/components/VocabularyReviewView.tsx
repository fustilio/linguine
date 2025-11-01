import { useVocabularyReview } from '@extension/api';
import { VocabularyReview } from '@extension/ui';
import { cn } from '@extension/ui';
import { RefreshCw } from 'lucide-react';

const VocabularyReviewView = () => {
  const {
    reviewQueue,
    currentItem,
    progress,
    isLoading,
    handleKnow,
    handleDontKnow,
    handleMastered,
    skip,
    refetch,
    resetIndex,
    nextReviewDate,
  } = useVocabularyReview(50);

  const handleRefresh = () => {
    refetch();
    resetIndex();
  };

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vocabulary Review</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50',
            'dark:bg-blue-700 dark:hover:bg-blue-600',
          )}
          title="Refresh review queue">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>
      <VocabularyReview
        reviewQueue={reviewQueue}
        currentItem={currentItem}
        progress={progress}
        isLoading={isLoading}
        onKnow={handleKnow}
        onDontKnow={handleDontKnow}
        onMastered={handleMastered}
        onSkip={skip}
        onRefresh={handleRefresh}
        nextReviewDate={nextReviewDate}
      />
    </div>
  );
};

export default VocabularyReviewView;
