import { useStorage } from '@extension/shared';
import { useVocabulary } from '@extension/sqlite';
import { exampleThemeStorage } from '@extension/storage';
import { DebugActions, VocabularyForm, VocabularyList, VocabularyToolbar, cn } from '@extension/ui';

export const VocabularyAdmin = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const {
    items,
    addVocabularyItem,
    updateVocabularyItemKnowledgeLevel,
    deleteVocabularyItem,
    populateDummyVocabulary,
    clearAllVocabulary,
    languageFilter,
    setLanguageFilter,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
  } = useVocabulary();

  return (
    <div className={cn('flex h-full flex-col', isLight ? 'text-gray-900' : 'text-gray-100')}>
      <div className="flex-shrink-0 space-y-4">
        <DebugActions
          populateDummyVocabulary={() => populateDummyVocabulary.mutate()}
          clearAllVocabulary={() => clearAllVocabulary.mutate()}
          isLight={isLight}
        />

        <VocabularyForm onAddItem={item => addVocabularyItem.mutate(item)} isLight={isLight} />

        <VocabularyToolbar languageFilter={languageFilter} onLanguageChange={setLanguageFilter} isLight={isLight} />
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className={cn('h-full overflow-y-auto rounded border p-2', isLight ? 'border-gray-200' : 'border-gray-700')}>
          <VocabularyList
            items={items}
            selectedItems={selectedItems}
            isLight={isLight}
            onToggleSelectAll={toggleSelectAll}
            onToggleItemSelected={toggleItemSelected}
            onUpdateLevel={(id, level) => updateVocabularyItemKnowledgeLevel.mutate({ id, level })}
            onDeleteItem={id => deleteVocabularyItem.mutate(id)}
          />
        </div>
      </div>
    </div>
  );
};
