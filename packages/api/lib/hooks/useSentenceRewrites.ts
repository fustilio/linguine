import {
  addSentenceRewrite as dbAddSentenceRewrite,
  clearAllSentenceRewrites as dbClearAllSentenceRewrites,
  deleteSentenceRewrite as dbDeleteSentenceRewrite,
  deleteSentenceRewrites as dbDeleteSentenceRewrites,
  ensureDatabaseInitialized,
  getSentenceRewrites,
  getSentenceRewriteCount,
} from '@extension/sqlite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { NewSentenceRewrite } from '@extension/sqlite';

const PAGE_SIZE = 10;

export const useSentenceRewrites = (filters?: {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}) => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const queryKey = ['sentenceRewrites', currentPage, filters];

  const { data: sentenceRewritesData } = useQuery({
    queryKey,
    queryFn: async () => {
      await ensureDatabaseInitialized();
      const [items, totalItems] = await Promise.all([
        getSentenceRewrites(currentPage, PAGE_SIZE, filters),
        getSentenceRewriteCount(filters),
      ]);
      return { items, totalItems };
    },
  });

  const { items = [], totalItems = 0 } = sentenceRewritesData || {};

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentenceRewrites'] });
      setSelectedItems(new Set());
    },
  };

  const addSentenceRewrite = useMutation({
    mutationFn: (rewrite: Omit<NewSentenceRewrite, 'id' | 'original_readability_score' | 'rewritten_readability_score' | 'created_at'>) => 
      dbAddSentenceRewrite(rewrite),
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['sentenceRewrites'] });
    },
  });

  const deleteSentenceRewrite = useMutation({
    mutationFn: (id: number) => dbDeleteSentenceRewrite(id),
    ...mutationOptions,
  });

  const bulkDelete = useMutation({
    mutationFn: () => dbDeleteSentenceRewrites(Array.from(selectedItems)),
    ...mutationOptions,
  });

  const clearAllSentenceRewrites = useMutation({
    mutationFn: dbClearAllSentenceRewrites,
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['sentenceRewrites'] });
    },
  });

  const goToPage = (page: number) => {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const toggleItemSelected = useCallback((id: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedItems(prev => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map(item => item.id));
    });
  }, [items]);

  return {
    items,
    totalItems,
    currentPage,
    pageSize: PAGE_SIZE,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    addSentenceRewrite,
    deleteSentenceRewrite,
    bulkDelete,
    clearAllSentenceRewrites,
  };
};
