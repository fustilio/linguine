import { 
  addTextRewrite as apiAddTextRewrite,
  clearAllTextRewrites as apiClearAllTextRewrites,
  deleteTextRewrite as apiDeleteTextRewrite,
  deleteTextRewrites as apiDeleteTextRewrites,
  getTextRewrites as apiGetTextRewrites,
  getTextRewriteCount as apiGetTextRewriteCount,
} from '../text-rewrites-api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { TextRewriteData } from '../text-rewrites-api.js';

const PAGE_SIZE = 10;

export const useTextRewrites = (filters?: {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}) => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const queryKey = ['textRewrites', currentPage, filters];

  const { data: textRewritesData } = useQuery({
    queryKey,
    queryFn: async () => {
      const [items, totalItems] = await Promise.all([
        apiGetTextRewrites(currentPage, PAGE_SIZE, filters),
        apiGetTextRewriteCount(filters),
      ]);
      return { items, totalItems };
    },
  });

  const { items = [], totalItems = 0 } = textRewritesData || {};

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['textRewrites'] });
      setSelectedItems(new Set());
    },
  };

  const addTextRewrite = useMutation({
    mutationFn: (rewrite: Omit<TextRewriteData, 'id' | 'original_readability_score' | 'rewritten_readability_score' | 'created_at'>) => 
      apiAddTextRewrite(rewrite),
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['textRewrites'] });
    },
  });

  const deleteTextRewrite = useMutation({
    mutationFn: (id: number) => apiDeleteTextRewrite(id),
    ...mutationOptions,
  });

  const bulkDelete = useMutation({
    mutationFn: () => apiDeleteTextRewrites(Array.from(selectedItems)),
    ...mutationOptions,
  });

  const clearAllTextRewrites = useMutation({
    mutationFn: apiClearAllTextRewrites,
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['textRewrites'] });
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
    addTextRewrite,
    deleteTextRewrite,
    bulkDelete,
    clearAllTextRewrites,
  };
};
