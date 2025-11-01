import { useVocabulary } from '@extension/api';
import { VocabularyForm, VocabularyList, VocabularyToolbar, Pagination, cn, themeVariants } from '@extension/ui';

export const VocabularyAdmin = () => {
  const {
    items,
    totalItems,
    currentPage,
    pageSize,
    goToPage,
    addVocabularyItem,
    deleteVocabularyItem,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    languageFilter,
    setLanguageFilter,
  } = useVocabulary({ manualLanguageFilter: true });

  return (
    <div className={cn('flex h-full flex-col p-6', themeVariants.container())}>
      <div className="flex-shrink-0 space-y-4">
        <VocabularyForm onAddItem={item => addVocabularyItem.mutate(item)} />

        <VocabularyToolbar languageFilter={languageFilter} onLanguageChange={setLanguageFilter} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className={cn('h-full overflow-y-auto rounded border p-2', themeVariants.card())}>
          <VocabularyList
            items={items}
            selectedItems={selectedItems}
            onToggleSelectAll={toggleSelectAll}
            onToggleItemSelected={toggleItemSelected}
            onDeleteItem={id => deleteVocabularyItem.mutate(id)}
          />
        </div>

        {/* Pagination */}
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize)}
            onPageChange={goToPage}
            showInfo={true}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </div>
      </div>
    </div>
  );
};
