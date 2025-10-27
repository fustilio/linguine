import {
  addVocabularyItem as dbAddVocabularyItem,
  clearAllVocabulary as dbClearAllVocabulary,
  deleteVocabularyItem as dbDeleteVocabularyItem,
  deleteVocabularyItems as dbDeleteVocabularyItems,
  getVocabulary,
  getVocabularyCount,
  initializeVocabularyDatabase,
  populateDummyVocabulary as dbPopulateDummyVocabulary,
  updateVocabularyItemKnowledgeLevel as dbUpdateVocabularyItemKnowledgeLevel,
  updateVocabularyItemKnowledgeLevels as dbUpdateVocabularyItemKnowledgeLevels,
} from '../lib/vocabulary.js';
import type { NewVocabularyItem, VocabularyItem } from '../lib/types.js';
import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 10;

export const useVocabulary = () => {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const loadVocabulary = useCallback(async (page: number) => {
    const [vocab, count] = await Promise.all([getVocabulary(page, PAGE_SIZE), getVocabularyCount()]);
    setItems(vocab);
    setTotalItems(count);
    setCurrentPage(page);
  }, []);

  useEffect(() => {
    initializeVocabularyDatabase().then(() => {
      loadVocabulary(1);
    });
  }, [loadVocabulary]);

  const addVocabularyItem = useCallback(
    async (item: Pick<NewVocabularyItem, 'text' | 'language'>) => {
      await dbAddVocabularyItem(item);
      loadVocabulary(1);
    },
    [loadVocabulary],
  );

  const updateVocabularyItemKnowledgeLevel = useCallback(
    async (id: number, level: number) => {
      const newLevel = Math.max(1, Math.min(5, level)); // clamp between 1 and 5
      await dbUpdateVocabularyItemKnowledgeLevel(id, newLevel);
      loadVocabulary(currentPage);
    },
    [loadVocabulary, currentPage],
  );

  const deleteVocabularyItem = useCallback(
    async (id: number) => {
      await dbDeleteVocabularyItem(id);
      loadVocabulary(currentPage);
    },
    [loadVocabulary, currentPage],
  );

  const populateDummyVocabulary = useCallback(async () => {
    await dbPopulateDummyVocabulary();
    loadVocabulary(1);
  }, [loadVocabulary]);

  const goToPage = useCallback(
    (page: number) => {
      const totalPages = Math.ceil(totalItems / PAGE_SIZE);
      const newPage = Math.max(1, Math.min(page, totalPages));
      loadVocabulary(newPage);
    },
    [loadVocabulary, totalItems],
  );

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

  const bulkDelete = useCallback(async () => {
    await dbDeleteVocabularyItems(Array.from(selectedItems));
    setSelectedItems(new Set());
    loadVocabulary(currentPage);
  }, [selectedItems, loadVocabulary, currentPage]);

  const bulkUpdateLevel = useCallback(
    async (levelChange: 1 | -1) => {
      await dbUpdateVocabularyItemKnowledgeLevels(Array.from(selectedItems), levelChange);
      setSelectedItems(new Set());
      loadVocabulary(currentPage);
    },
    [selectedItems, loadVocabulary, currentPage],
  );

  const clearAllVocabulary = useCallback(async () => {
    await dbClearAllVocabulary();
    setSelectedItems(new Set());
    loadVocabulary(1);
  }, [loadVocabulary]);

  return {
    items,
    addVocabularyItem,
    updateVocabularyItemKnowledgeLevel,
    deleteVocabularyItem,
    populateDummyVocabulary,
    currentPage,
    totalItems,
    pageSize: PAGE_SIZE,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    bulkDelete,
    bulkUpdateLevel,
    clearAllVocabulary,
  };
};
