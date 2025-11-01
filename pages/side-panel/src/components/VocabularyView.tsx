import { useVocabulary } from '@extension/api';
import { withErrorBoundary, withSuspense, useStorage, LANGUAGES } from '@extension/shared';
import { languageStorage } from '@extension/storage';
import {
  cn,
  ErrorDisplay,
  LoadingSpinner,
  BulkActionsBar,
  VocabularyList,
  VocabularyToolbar,
  Pagination,
} from '@extension/ui';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Languages } from 'lucide-react';
import { useEffect, useState } from 'react';

const VocabularyView = () => {
  const queryClient = useQueryClient();
  const [showMetadata, setShowMetadata] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { targetLearningLanguage } = useStorage(languageStorage);
  const {
    items,
    totalItems,
    currentPage,
    pageSize,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    updateVocabularyItemKnowledgeLevel,
    deleteVocabularyItem,
    bulkDelete,
    refetch,
  } = useVocabulary();

  // Listen for cache invalidation messages
  useEffect(() => {
    const handleMessage = (
      message: { action?: string; target?: string },
      _sender: unknown,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (message.action === 'invalidateVocabularyCache' && (!message.target || message.target === 'sidepanel')) {
        queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
        sendResponse({ success: true });
        return true;
      }
      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [queryClient]);

  const handleRefresh = async () => {
    if (!refetch || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Invalidate all vocabulary-related queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
        queryClient.invalidateQueries({ queryKey: ['vocabularyCount'] }),
      ]);
      // Refetch the current query
      if (refetch) {
        await refetch();
      }
    } catch (error) {
      console.error('Failed to refresh vocabulary:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className={cn('text-xl font-bold text-gray-900 dark:text-gray-100')}>Vocabulary Tracker</h2>
          <div className="flex items-center gap-2">
            <Languages size={14} className="text-gray-600 dark:text-gray-400" />
            <label htmlFor="targetLanguageSelector" className="text-sm text-gray-600 dark:text-gray-400">
              Learning:
            </label>
            <select
              id="targetLanguageSelector"
              value={targetLearningLanguage || ''}
              onChange={e => {
                if (e.target.value) {
                  languageStorage.setTargetLearningLanguage(e.target.value);
                }
              }}
              className={cn(
                'rounded-lg border px-2 py-1 text-sm transition-colors focus:outline-none focus:ring-2',
                'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
                'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400',
              )}>
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing || !refetch}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50',
            'dark:bg-blue-700 dark:hover:bg-blue-600',
          )}
          title="Refresh vocabulary list">
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <VocabularyToolbar showMetadata={showMetadata} onToggleMetadata={() => setShowMetadata(!showMetadata)} />

      {selectedItems.size > 0 && (
        <BulkActionsBar selectedItemsCount={selectedItems.size} onDelete={() => bulkDelete.mutate()} />
      )}

      <VocabularyList
        items={items}
        selectedItems={selectedItems}
        onToggleSelectAll={toggleSelectAll}
        onToggleItemSelected={toggleItemSelected}
        onDeleteItem={id => deleteVocabularyItem.mutate(id)}
        onLearnAgain={id => updateVocabularyItemKnowledgeLevel.mutate({ id, level: 1 })}
        showMetadata={showMetadata}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / pageSize)}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={goToPage}
      />
    </div>
  );
};

export default withErrorBoundary(withSuspense(VocabularyView, <LoadingSpinner />), ErrorDisplay);
