import {
  getReviewQueue as apiGetReviewQueue,
  markAsReviewed as apiMarkAsReviewed,
  updateVocabularyItemKnowledgeLevel as apiUpdateVocabularyItemKnowledgeLevel,
  getNextReviewDate as apiGetNextReviewDate,
} from '../vocabulary-api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

export const useVocabularyReview = (limit?: number) => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const queryKey = useMemo(() => ['reviewQueue', limit], [limit]);

  const {
    data: reviewQueue = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => apiGetReviewQueue(limit),
  });

  const { data: nextReviewDate } = useQuery({
    queryKey: ['nextReviewDate'],
    queryFn: apiGetNextReviewDate,
  });

  const currentItem = useMemo(() => reviewQueue[currentIndex] || null, [reviewQueue, currentIndex]);

  const progress = useMemo(
    () => ({
      current: currentIndex + 1,
      total: reviewQueue.length,
    }),
    [currentIndex, reviewQueue.length],
  );

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      queryClient.invalidateQueries({ queryKey: ['nextReviewDate'] });
    },
  };

  const markAsReviewed = useMutation({
    mutationFn: ({ id, newLevel }: { id: number; newLevel?: number }) => {
      if (newLevel !== undefined) {
        return apiUpdateVocabularyItemKnowledgeLevel(id, Math.max(1, Math.min(5, newLevel)));
      }
      return apiMarkAsReviewed(id);
    },
    ...mutationOptions,
  });

  const nextItem = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, reviewQueue.length - 1));
  }, [reviewQueue.length]);

  const skip = useCallback(() => {
    nextItem();
  }, [nextItem]);

  const markReviewed = useCallback(
    (id: number, newLevel?: number) => {
      markAsReviewed.mutate(
        { id, newLevel },
        {
          onSuccess: () => {
            // Move to next item after successful review
            if (currentIndex < reviewQueue.length - 1) {
              setCurrentIndex(prev => prev + 1);
            } else {
              // Refresh queue if we've reviewed all items
              refetch();
              setCurrentIndex(0);
            }
          },
        },
      );
    },
    [markAsReviewed, currentIndex, reviewQueue.length, refetch],
  );

  const handleKnow = useCallback(() => {
    if (!currentItem) return;
    const newLevel = Math.min(5, currentItem.knowledge_level + 1);
    markReviewed(currentItem.id, newLevel);
  }, [currentItem, markReviewed]);

  const handleDontKnow = useCallback(() => {
    if (!currentItem) return;
    const newLevel = Math.max(1, currentItem.knowledge_level - 1);
    markReviewed(currentItem.id, newLevel);
  }, [currentItem, markReviewed]);

  const handleMastered = useCallback(() => {
    if (!currentItem) return;
    markReviewed(currentItem.id, 5);
  }, [currentItem, markReviewed]);

  // Reset to first item when queue changes
  const resetIndex = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  return {
    reviewQueue,
    currentItem,
    currentIndex,
    progress,
    isLoading,
    nextItem,
    skip,
    markReviewed,
    handleKnow,
    handleDontKnow,
    handleMastered,
    refetch,
    resetIndex,
    nextReviewDate,
  };
};
