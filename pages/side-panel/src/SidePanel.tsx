import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { useVocabulary } from '@extension/sqlite';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { BulkActionsBar } from './components/BulkActionsBar';
import { DebugActions } from './components/DebugActions';
import { Header } from './components/Header';
import { Pagination } from './components/Pagination';
import { VocabularyForm } from './components/VocabularyForm';
import { VocabularyList } from './components/VocabularyList';

const SidePanel = () => {
  const {
    items,
    addVocabularyItem,
    updateVocabularyItemKnowledgeLevel,
    deleteVocabularyItem,
    populateDummyVocabulary,
    clearAllVocabulary,
    currentPage,
    totalItems,
    pageSize,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    bulkDelete,
    bulkUpdateLevel,
  } = useVocabulary();

  const { isLight } = useStorage(exampleThemeStorage);
  const logo = isLight ? 'side-panel/logo_vertical.svg' : 'side-panel/logo_vertical_dark.svg';

  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <div className="container mx-auto p-4">
        <Header isLight={isLight} logo={logo} />

        <div className="mt-8">
          <h2 className={cn('mb-4 text-xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            Vocabulary Tracker
          </h2>

          <VocabularyForm onAddItem={addVocabularyItem} isLight={isLight} />

          {selectedItems.size > 0 && (
            <BulkActionsBar
              selectedItemsCount={selectedItems.size}
              onLevelUp={() => bulkUpdateLevel(1)}
              onLevelDown={() => bulkUpdateLevel(-1)}
              onDelete={bulkDelete}
            />
          )}

          <VocabularyList
            items={items}
            selectedItems={selectedItems}
            isLight={isLight}
            onToggleSelectAll={toggleSelectAll}
            onToggleItemSelected={toggleItemSelected}
            onUpdateLevel={updateVocabularyItemKnowledgeLevel}
            onDeleteItem={deleteVocabularyItem}
          />

          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            isLight={isLight}
            onPageChange={goToPage}
          />
        </div>

        <DebugActions
          populateDummyVocabulary={populateDummyVocabulary}
          clearAllVocabulary={clearAllVocabulary}
          isLight={isLight}
        />
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
