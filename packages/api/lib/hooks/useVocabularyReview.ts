import {
  getReviewQueue as apiGetReviewQueue,
  markAsReviewed as apiMarkAsReviewed,
  updateVocabularyItemKnowledgeLevel as apiUpdateVocabularyItemKnowledgeLevel,
  getNextReviewDate as apiGetNextReviewDate,
} from '../vocabulary-api.js';
import { useStorage } from '@extension/shared';
import { languageStorage } from '@extension/storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const useVocabularyReview = (limit?: number) => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { targetLearningLanguage } = useStorage(languageStorage);

  // Include language in query key for proper cache invalidation
  // Use null instead of undefined to ensure consistent caching
  const queryKey = useMemo(
    () => ['reviewQueue', limit, targetLearningLanguage ?? null],
    [limit, targetLearningLanguage],
  );

  const {
    data: reviewQueue = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => apiGetReviewQueue(limit, targetLearningLanguage ?? null),
  });

  // Invalidate queries when target language changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
    queryClient.invalidateQueries({ queryKey: ['nextReviewDate'] });
  }, [targetLearningLanguage, queryClient]);

  const { data: nextReviewDate } = useQuery({
    queryKey: ['nextReviewDate', targetLearningLanguage ?? null],
    queryFn: () => apiGetNextReviewDate(targetLearningLanguage ?? null),
  });

  const currentItem = useMemo(() => reviewQueue[currentIndex] || null, [reviewQueue, currentIndex]);

  // Reset flip state when item changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentItem?.id]);

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

  // ANKI-style handlers
  const handleAgain = useCallback(() => {
    if (!currentItem) return;
    const newLevel = Math.max(1, currentItem.knowledge_level - 1);
    markReviewed(currentItem.id, newLevel);
  }, [currentItem, markReviewed]);

  const handleHard = useCallback(() => {
    if (!currentItem) return;
    // Mark as reviewed but don't change knowledge level
    markReviewed(currentItem.id, currentItem.knowledge_level);
  }, [currentItem, markReviewed]);

  const handleGood = useCallback(() => {
    if (!currentItem) return;
    const newLevel = Math.min(5, currentItem.knowledge_level + 1);
    markReviewed(currentItem.id, newLevel);
  }, [currentItem, markReviewed]);

  const handleEasy = useCallback(() => {
    if (!currentItem) return;
    markReviewed(currentItem.id, 5);
  }, [currentItem, markReviewed]);

  // Reset to first item when queue changes
  const resetIndex = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  return {
    reviewQueue,
    currentItem,
    currentIndex,
    progress,
    isLoading,
    isFlipped,
    nextItem,
    skip,
    markReviewed,
    handleKnow,
    handleDontKnow,
    handleMastered,
    handleAgain,
    handleHard,
    handleGood,
    handleEasy,
    flipCard,
    refetch,
    resetIndex,
    nextReviewDate,
  };
};
