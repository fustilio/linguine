import { Badge } from './badge';
import { Card, CardContent, CardHeader } from './card';
import { cn } from '@/lib/utils';
import { Award, Loader2, RotateCcw } from 'lucide-react';
import type { VocabularyItem } from '@extension/sqlite';

interface VocabularyReviewProps {
  reviewQueue: VocabularyItem[];
  currentItem: VocabularyItem | null;
  progress: { current: number; total: number };
  isLoading?: boolean;
  isFlipped?: boolean;
  translation: string;
  exampleUsage: string;
  cardBackLoading?: boolean;
  onFlip: () => void;
  onAgain: () => void;
  onHard: () => void;
  onGood: () => void;
  onEasy: () => void;
  onRefresh?: () => void;
  nextReviewDate?: string | null;
}

export const VocabularyReview = ({
  reviewQueue,
  currentItem,
  progress,
  isLoading = false,
  isFlipped = false,
  translation,
  exampleUsage,
  cardBackLoading = false,
  onFlip,
  onAgain,
  onHard,
  onGood,
  onEasy,
  onRefresh,
  nextReviewDate,
}: VocabularyReviewProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const formatNextReviewDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs <= 0) return 'Available now';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `In ${diffMinutes} min${diffMinutes !== 1 ? 's' : ''}`;
    }
    if (diffHours < 24) {
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
    return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  if (reviewQueue.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <Award className="mx-auto h-16 w-16 text-green-500 dark:text-green-400" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">All caught up!</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">No words need review at this time.</p>
          {nextReviewDate && (
            <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Next review available:</span>{' '}
                <span className="text-blue-600 dark:text-blue-400">{formatNextReviewDate(nextReviewDate)}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!currentItem) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Review session complete!</p>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              Refresh Queue
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  const knowledgeLevelLabels = {
    5: 'Mastered',
    4: 'Easy',
    3: 'Easy',
    2: 'Moderate',
    1: 'Challenging',
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Review Progress</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {progress.current} of {progress.total}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
        {nextReviewDate && (
          <div className="mt-3 border-t border-gray-300 pt-3 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Next review available:</span>{' '}
              <span className="text-blue-600 dark:text-blue-400">{formatNextReviewDate(nextReviewDate)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Flashcard */}
      <div className="relative">
        <div
          onClick={() => !isFlipped && onFlip()}
          className={cn(
            'cursor-pointer transition-all duration-300',
            !isFlipped && 'cursor-pointer',
            isFlipped && 'cursor-default',
          )}>
          <Card
            variant="elevated"
            className={cn('relative min-h-[300px] flex flex-col')}>
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-end">
              <Badge
                variant={
                  currentItem.knowledge_level === 5
                    ? 'default'
                    : currentItem.knowledge_level >= 3
                      ? 'success'
                      : 'warning'
                }
                size="sm">
                {knowledgeLevelLabels[currentItem.knowledge_level as keyof typeof knowledgeLevelLabels]} (
                {currentItem.knowledge_level}/5)
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col items-center justify-center space-y-6 py-12">
            {!isFlipped ? (
              // Front of card - Word only
              <div className="text-center">
                <h2 className="text-5xl font-bold text-gray-900 dark:text-gray-100">{currentItem.text}</h2>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Click to reveal answer</p>
              </div>
            ) : (
              // Back of card - Translation and example
              <div className="w-full space-y-6 text-center">
                {cardBackLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-4 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Generating translation...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Translation
                      </p>
                      <h3 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{translation}</h3>
                    </div>
                    {exampleUsage && (
                      <div className="space-y-2 border-t border-gray-200 pt-6 dark:border-gray-700">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Example Usage
                        </p>
                        <p className="text-lg text-gray-700 dark:text-gray-300 italic">"{exampleUsage}"</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
          </Card>
        </div>

        {/* Rating Buttons - Only show when flipped */}
        {isFlipped && !cardBackLoading && (
          <div className="mt-6 grid grid-cols-4 gap-3">
            <button
              type="button"
              onClick={onAgain}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-4 transition-all',
                'hover:border-red-400 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30',
              )}>
              <RotateCcw className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-900 dark:text-red-200">Again</span>
            </button>

            <button
              type="button"
              onClick={onHard}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-orange-300 bg-orange-50 p-4 transition-all',
                'hover:border-orange-400 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/20 dark:hover:bg-orange-900/30',
              )}>
              <span className="text-lg font-medium text-orange-900 dark:text-orange-200">😓</span>
              <span className="text-xs font-medium text-orange-900 dark:text-orange-200">Hard</span>
            </button>

            <button
              type="button"
              onClick={onGood}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-green-300 bg-green-50 p-4 transition-all',
                'hover:border-green-400 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30',
              )}>
              <span className="text-lg font-medium text-green-900 dark:text-green-200">😊</span>
              <span className="text-xs font-medium text-green-900 dark:text-green-200">Good</span>
            </button>

            <button
              type="button"
              onClick={onEasy}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-blue-300 bg-blue-50 p-4 transition-all',
                'hover:border-blue-400 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30',
              )}>
              <span className="text-lg font-medium text-blue-900 dark:text-blue-200">😎</span>
              <span className="text-xs font-medium text-blue-900 dark:text-blue-200">Easy</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
