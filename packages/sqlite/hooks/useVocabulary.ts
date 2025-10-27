import {
  addVocabularyItem as dbAddVocabularyItem,
  clearAllVocabulary as dbClearAllVocabulary,
  deleteVocabularyItem as dbDeleteVocabularyItem,
  deleteVocabularyItems as dbDeleteVocabularyItems,
  ensureDatabaseInitialized,
  getVocabulary,
  getVocabularyCount,
  populateDummyVocabulary as dbPopulateDummyVocabulary,
  updateVocabularyItemKnowledgeLevel as dbUpdateVocabularyItemKnowledgeLevel,
  updateVocabularyItemKnowledgeLevels as dbUpdateVocabularyItemKnowledgeLevels,
} from '../lib/vocabulary.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { NewVocabularyItem } from '../lib/types.js';

const PAGE_SIZE = 10;

export const useVocabulary = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);

  const queryKey = ['vocabulary', currentPage, languageFilter];

  const { data: vocabularyData } = useQuery({
    queryKey,
    queryFn: async () => {
      await ensureDatabaseInitialized();
      const [items, totalItems] = await Promise.all([
        getVocabulary(currentPage, PAGE_SIZE, languageFilter),
        getVocabularyCount(languageFilter),
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
    mutationFn: (item: Pick<NewVocabularyItem, 'text' | 'language'>) => dbAddVocabularyItem(item),
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const updateVocabularyItemKnowledgeLevel = useMutation({
    mutationFn: ({ id, level }: { id: number; level: number }) =>
      dbUpdateVocabularyItemKnowledgeLevel(id, Math.max(1, Math.min(5, level))),
    ...mutationOptions,
  });

  const deleteVocabularyItem = useMutation({
    mutationFn: (id: number) => dbDeleteVocabularyItem(id),
    ...mutationOptions,
  });

  const populateDummyVocabulary = useMutation({
    mutationFn: dbPopulateDummyVocabulary,
    ...mutationOptions,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: () => dbDeleteVocabularyItems(Array.from(selectedItems)),
    ...mutationOptions,
  });

  const bulkUpdateLevel = useMutation({
    mutationFn: (levelChange: 1 | -1) => dbUpdateVocabularyItemKnowledgeLevels(Array.from(selectedItems), levelChange),
    ...mutationOptions,
  });

  const clearAllVocabulary = useMutation({
    mutationFn: dbClearAllVocabulary,
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
  };
};
