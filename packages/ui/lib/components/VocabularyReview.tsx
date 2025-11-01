import { Badge } from './badge';
import { Card, CardContent, CardHeader } from './card';
import { getLanguageDisplayName } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Award, CheckCircle2, ChevronRight, Loader2, XCircle } from 'lucide-react';
import type { VocabularyItem } from '@extension/sqlite';

interface VocabularyReviewProps {
  reviewQueue: VocabularyItem[];
  currentItem: VocabularyItem | null;
  progress: { current: number; total: number };
  isLoading?: boolean;
  onKnow: () => void;
  onDontKnow: () => void;
  onMastered: () => void;
  onSkip: () => void;
  onRefresh?: () => void;
  nextReviewDate?: string | null;
}

export const VocabularyReview = ({
  reviewQueue,
  currentItem,
  progress,
  isLoading = false,
  onKnow,
  onDontKnow,
  onMastered,
  onSkip,
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
    // Changed from days/weeks to hours/minutes (1 hour review interval)
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

  const knowledgeLevelColors = {
    5: 'bg-gray-500',
    4: 'bg-green-500',
    3: 'bg-green-500',
    2: 'bg-yellow-500',
    1: 'bg-orange-500',
  };

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

      {/* Review Card */}
      <Card variant="elevated" className="relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="default" size="sm">
              {getLanguageDisplayName(currentItem.language)}
            </Badge>
            <Badge
              variant={
                currentItem.knowledge_level === 5 ? 'default' : currentItem.knowledge_level >= 3 ? 'success' : 'warning'
              }
              size="sm">
              {knowledgeLevelLabels[currentItem.knowledge_level as keyof typeof knowledgeLevelLabels]} (
              {currentItem.knowledge_level}/5)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Vocabulary Word */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100">{currentItem.text}</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <div
                className={cn(
                  'h-1.5 w-full max-w-xs rounded-full',
                  knowledgeLevelColors[currentItem.knowledge_level as keyof typeof knowledgeLevelColors],
                )}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={onDontKnow}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-4 transition-all',
                'hover:border-red-400 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30',
              )}>
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-900 dark:text-red-200">I don't know</span>
            </button>

            <button
              type="button"
              onClick={onSkip}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-gray-300 bg-gray-50 p-4 transition-all',
                'hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700',
              )}>
              <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Skip</span>
            </button>

            <button
              type="button"
              onClick={onKnow}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-green-300 bg-green-50 p-4 transition-all',
                'hover:border-green-400 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30',
              )}>
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-200">I know this</span>
            </button>

            <button
              type="button"
              onClick={onMastered}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4 transition-all',
                'hover:border-yellow-400 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30',
              )}>
              <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Mastered</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
