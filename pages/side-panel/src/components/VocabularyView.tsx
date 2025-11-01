import { useVocabulary } from '@extension/api';
import { withErrorBoundary, withSuspense } from '@extension/shared';
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
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const VocabularyView = () => {
  const queryClient = useQueryClient();
  const [showMetadata, setShowMetadata] = useState(false);
  const {
    items,
    totalItems,
    currentPage,
    pageSize,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    languageFilter,
    setLanguageFilter,
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    refetch();
  };

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className={cn('text-xl font-bold text-gray-900 dark:text-gray-100')}>Vocabulary Tracker</h2>
        <button
          type="button"
          onClick={handleRefresh}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'bg-blue-600 text-white hover:bg-blue-700',
            'dark:bg-blue-700 dark:hover:bg-blue-600',
          )}
          title="Refresh vocabulary list">
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      <VocabularyToolbar
        languageFilter={languageFilter}
        onLanguageChange={setLanguageFilter}
        showMetadata={showMetadata}
        onToggleMetadata={() => setShowMetadata(!showMetadata)}
      />

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
