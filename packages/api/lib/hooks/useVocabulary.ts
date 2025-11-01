import {
  addVocabularyItem as apiAddVocabularyItem,
  resetVocabularyDatabase as apiResetVocabularyDatabase,
  deleteVocabularyItem as apiDeleteVocabularyItem,
  deleteVocabularyItems as apiDeleteVocabularyItems,
  getVocabulary as apiGetVocabulary,
  getVocabularyCount as apiGetVocabularyCount,
  populateDummyVocabulary as apiPopulateDummyVocabulary,
  updateVocabularyItemKnowledgeLevel as apiUpdateVocabularyItemKnowledgeLevel,
  updateVocabularyItemKnowledgeLevels as apiUpdateVocabularyItemKnowledgeLevels,
} from '../vocabulary-api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { NewVocabularyItem } from '../vocabulary-api.js';

const PAGE_SIZE = 10;

export const useVocabulary = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);

  // Stabilize query key to prevent unnecessary cache misses
  const queryKey = useMemo(() => ['vocabulary', currentPage, languageFilter], [currentPage, languageFilter]);

  const { data: vocabularyData, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const [items, totalItems] = await Promise.all([
        apiGetVocabulary(currentPage, PAGE_SIZE, languageFilter),
        apiGetVocabularyCount(languageFilter),
      ]);
      return { items, totalItems };
    },
  });

  const { items = [], totalItems = 0 } = vocabularyData || {};

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      setSelectedItems(new Set());
    },
  };

  const addVocabularyItem = useMutation({
    mutationFn: (item: Pick<NewVocabularyItem, 'text' | 'language'>) => apiAddVocabularyItem(item),
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const updateVocabularyItemKnowledgeLevel = useMutation({
    mutationFn: ({ id, level }: { id: number; level: number }) =>
      apiUpdateVocabularyItemKnowledgeLevel(id, Math.max(1, Math.min(5, level))),
    ...mutationOptions,
  });

  const deleteVocabularyItem = useMutation({
    mutationFn: (id: number) => apiDeleteVocabularyItem(id),
    ...mutationOptions,
  });

  const populateDummyVocabulary = useMutation({
    mutationFn: apiPopulateDummyVocabulary,
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: () => apiDeleteVocabularyItems(Array.from(selectedItems)),
    ...mutationOptions,
  });

  const bulkUpdateLevel = useMutation({
    mutationFn: (levelChange: 1 | -1) => apiUpdateVocabularyItemKnowledgeLevels(Array.from(selectedItems), levelChange),
    ...mutationOptions,
  });

  const clearAllVocabulary = useMutation({
    mutationFn: apiResetVocabularyDatabase,
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
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
    languageFilter,
    setLanguageFilter,
    addVocabularyItem,
    updateVocabularyItemKnowledgeLevel,
    deleteVocabularyItem,
    populateDummyVocabulary,
    bulkDelete,
    bulkUpdateLevel,
    clearAllVocabulary,
    refetch,
  };
};
