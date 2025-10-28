import '@src/SidePanel.css';
import { Header } from './components/Header';
import { Pagination } from './components/Pagination';
import { useVocabulary } from '@extension/api';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import {
  cn,
  ErrorDisplay,
  LoadingSpinner,
  BulkActionsBar,
  DebugActions,
  VocabularyForm,
  VocabularyList,
  VocabularyToolbar,
} from '@extension/ui';

const SidePanel = () => {
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

  const logo = 'side-panel/pasta-illustration-2.svg';

  return (
    <div className={cn('App bg-slate-50 dark:bg-gray-800')}>
      <div className="container mx-auto p-4">
        <Header logo={logo} />

        <div className="mt-8">
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
        </div>

        <DebugActions
          populateDummyVocabulary={() => populateDummyVocabulary.mutate()}
          clearAllVocabulary={() => clearAllVocabulary.mutate()}
        />
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
