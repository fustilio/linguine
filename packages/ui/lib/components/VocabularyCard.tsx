import { Badge } from './badge';
import { Card, CardContent } from './card';
import { getLanguageDisplayName } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Award, Calendar, MoreVertical, RotateCcw, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { VocabularyItem } from '@extension/sqlite';

interface VocabularyCardProps {
  item: VocabularyItem;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  onLearnAgain?: (id: number) => void;
  showCheckbox?: boolean;
  showMetadata?: boolean;
}

const getKnowledgeLevelColor = (level: number): string => {
  if (level === 5) return 'bg-gray-500'; // Mastered
  if (level >= 3) return 'bg-green-500'; // Easy
  if (level >= 2) return 'bg-yellow-500'; // Moderate
  return 'bg-orange-500'; // Challenging
};

const getKnowledgeLevelLabel = (level: number): string => {
  if (level === 5) return 'Mastered';
  if (level >= 3) return 'Easy';
  if (level >= 2) return 'Moderate';
  return 'Challenging';
};

const formatReviewDate = (dateString: string | null): string => {
  if (!dateString) return 'Never reviewed';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

const getReviewBadgeVariant = (dateString: string | null): 'success' | 'warning' | 'danger' | 'default' => {
  if (!dateString) return 'danger'; // Never reviewed - overdue
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  // Changed from days to hours (1 hour review interval)
  if (diffHours > 1) return 'danger'; // Overdue
  if (diffHours > 0.5) return 'warning'; // Due soon
  return 'success'; // Recently reviewed
};

const calculateNextReviewDate = (lastReviewedAt: string | null, createdAt: string): Date => {
  if (!lastReviewedAt) {
    // If never reviewed, check if it's new (created recently)
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    // If created more than 1 hour ago, it's due now
    if (diffMinutes >= 60) {
      return now; // Due now
    }
    // Otherwise, due in (60 - minutes) minutes
    const dueDate = new Date(created);
    dueDate.setHours(dueDate.getHours() + 1);
    return dueDate;
  }
  
  const lastReviewed = new Date(lastReviewedAt);
  const nextReview = new Date(lastReviewed);
  nextReview.setHours(nextReview.getHours() + 1); // Due 1 hour after last review
  return nextReview;
};

const formatDueForReview = (lastReviewedAt: string | null, createdAt: string): string => {
  const nextReview = calculateNextReviewDate(lastReviewedAt, createdAt);
  const now = new Date();
  const diffMs = nextReview.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'Due now';
  }
  
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

export const VocabularyCard = ({
  item,
  isSelected = false,
  onToggleSelect,
  onDelete,
  onLearnAgain,
  showCheckbox = true,
  showMetadata = false,
}: VocabularyCardProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const levelColor = getKnowledgeLevelColor(item.knowledge_level);
  const levelLabel = getKnowledgeLevelLabel(item.knowledge_level);
  const reviewDate = formatReviewDate(item.last_reviewed_at);
  const reviewBadgeVariant = getReviewBadgeVariant(item.last_reviewed_at);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreOptions(false);
      }
    };

    if (showMoreOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreOptions]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(item.id);
    }
    setShowMoreOptions(false);
  };

  const handleLearnAgain = () => {
    if (onLearnAgain) {
      onLearnAgain(item.id);
    }
    setShowMoreOptions(false);
  };

  return (
    <Card
      variant="interactive"
      className={cn('transition-all duration-200 hover:shadow-md', isSelected && 'ring-2 ring-blue-500')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {showCheckbox && onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Vocabulary Text */}
            <div className="mb-2">
              <h3 className={cn('break-words text-base font-semibold text-gray-900 dark:text-gray-100')}>
                {item.text}
              </h3>
            </div>

            {/* Metadata Row */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="default" size="sm">
                {getLanguageDisplayName(item.language)}
              </Badge>
              <Badge variant={reviewBadgeVariant} size="sm" className="flex items-center gap-1">
                <Calendar size={12} />
                {reviewDate}
              </Badge>
              {showMetadata && (
                <Badge variant="default" size="sm" className="flex items-center gap-1">
                  <Calendar size={12} />
                  Due: {formatDueForReview(item.last_reviewed_at, item.created_at)}
                </Badge>
              )}
            </div>

            {/* Knowledge Level Indicator */}
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Knowledge Level:</span>
                <Badge
                  variant={item.knowledge_level === 5 ? 'default' : item.knowledge_level >= 3 ? 'success' : 'warning'}
                  size="sm">
                  {levelLabel} ({item.knowledge_level}/5)
                </Badge>
              </div>
              {/* Level Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={cn('h-full transition-all duration-300', levelColor)}
                  style={{ width: `${(item.knowledge_level / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              {item.knowledge_level === 5 && (
                <span title="Mastered">
                  <Award size={16} className="text-yellow-500 dark:text-yellow-400" />
                </span>
              )}

              {/* More Options Menu */}
              {(onDelete || onLearnAgain) && (
                <div className="relative ml-auto" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    className={cn(
                      'flex items-center justify-center rounded p-1.5 transition-colors',
                      'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                    )}
                    title="More options">
                    <MoreVertical size={16} />
                  </button>

                  {showMoreOptions && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      {onLearnAgain && item.knowledge_level === 5 && (
                        <button
                          type="button"
                          onClick={handleLearnAgain}
                          className={cn(
                            'w-full px-4 py-2 text-left text-sm transition-colors',
                            'flex items-center gap-2 text-gray-700 hover:bg-gray-100',
                            'dark:text-gray-300 dark:hover:bg-gray-700',
                            'first:rounded-t-md',
                          )}
                          title="Reset to level 1 to learn again">
                          <RotateCcw size={14} />
                          Learn Again
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          className={cn(
                            'w-full px-4 py-2 text-left text-sm transition-colors',
                            'flex items-center gap-2 text-red-600 hover:bg-red-50',
                            'dark:text-red-400 dark:hover:bg-red-900/20',
                            onLearnAgain && item.knowledge_level === 5 ? '' : 'first:rounded-t-md',
                            'last:rounded-b-md',
                          )}
                          title="Delete vocabulary item">
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
