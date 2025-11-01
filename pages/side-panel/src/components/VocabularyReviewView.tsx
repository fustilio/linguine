import { useVocabularyReview, useVocabularyCardBack } from '@extension/api';
import { VocabularyReview } from '@extension/ui';
import { cn } from '@extension/ui';
import { useStorage, LANGUAGES } from '@extension/shared';
import { languageStorage } from '@extension/storage';
import { RefreshCw, Languages } from 'lucide-react';

const VocabularyReviewView = () => {
  const { targetLearningLanguage } = useStorage(languageStorage);
  const {
    reviewQueue,
    currentItem,
    progress,
    isLoading,
    isFlipped,
    handleAgain,
    handleHard,
    handleGood,
    handleEasy,
    flipCard,
    refetch,
    resetIndex,
    nextReviewDate,
  } = useVocabularyReview(50);

  const { translation, exampleUsage, isLoading: cardBackLoading } = useVocabularyCardBack(currentItem);

  const handleRefresh = () => {
    refetch();
    resetIndex();
  };

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vocabulary Review</h2>
          <div className="flex items-center gap-2">
            <Languages size={14} className="text-gray-600 dark:text-gray-400" />
            <label htmlFor="targetLanguageSelectorReview" className="text-sm text-gray-600 dark:text-gray-400">
              Learning:
            </label>
            <select
              id="targetLanguageSelectorReview"
              value={targetLearningLanguage || ''}
              onChange={e => {
                if (e.target.value) {
                  languageStorage.setTargetLearningLanguage(e.target.value);
                }
              }}
              className={cn(
                'rounded-lg border px-2 py-1 text-sm transition-colors focus:outline-none focus:ring-2',
                'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
                'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400',
              )}>
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
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
        isFlipped={isFlipped}
        translation={translation}
        exampleUsage={exampleUsage}
        cardBackLoading={cardBackLoading}
        onFlip={flipCard}
        onAgain={handleAgain}
        onHard={handleHard}
        onGood={handleGood}
        onEasy={handleEasy}
        onRefresh={handleRefresh}
        nextReviewDate={nextReviewDate}
      />
    </div>
  );
};

export default VocabularyReviewView;
