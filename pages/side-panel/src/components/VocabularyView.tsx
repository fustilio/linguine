import { useVocabulary } from '@extension/api';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import {
  cn,
  ErrorDisplay,
  LoadingSpinner,
  BulkActionsBar,
  DebugActions,
  VocabularyForm,
  VocabularyList,
  VocabularyToolbar,
  Pagination,
} from '@extension/ui';

const VocabularyView = () => {
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
    addVocabularyItem,
    updateVocabularyItemKnowledgeLevel,
    deleteVocabularyItem,
    populateDummyVocabulary,
    bulkDelete,
    bulkUpdateLevel,
    clearAllVocabulary,
  } = useVocabulary();

  return (
    <div className="pt-4">
      <h2 className={cn('mb-4 text-xl font-bold text-gray-900 dark:text-gray-100')}>
        Vocabulary Tracker
      </h2>

      <VocabularyForm onAddItem={item => addVocabularyItem.mutate(item)} />
      <VocabularyToolbar languageFilter={languageFilter} onLanguageChange={setLanguageFilter} />

      {selectedItems.size > 0 && (
        <BulkActionsBar
          selectedItemsCount={selectedItems.size}
          onLevelUp={() => bulkUpdateLevel.mutate(1)}
          onLevelDown={() => bulkUpdateLevel.mutate(-1)}
          onDelete={() => bulkDelete.mutate()}
        />
      )}

      <VocabularyList
        items={items}
        selectedItems={selectedItems}
        onToggleSelectAll={toggleSelectAll}
        onToggleItemSelected={toggleItemSelected}
        onUpdateLevel={(id, level) => updateVocabularyItemKnowledgeLevel.mutate({ id, level })}
        onDeleteItem={id => deleteVocabularyItem.mutate(id)}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={goToPage}
      />

      <DebugActions
        populateDummyVocabulary={() => populateDummyVocabulary.mutate()}
        clearAllVocabulary={() => clearAllVocabulary.mutate()}
      />
    </div>
  );
};

export default withErrorBoundary(withSuspense(VocabularyView, <LoadingSpinner />), ErrorDisplay);
