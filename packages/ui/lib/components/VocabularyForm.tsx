import { button, input, select } from './common-styles';
import { cn } from '@/lib/utils';
import { LANGUAGES, normalizeLanguageCode, getLanguageDisplayName, useStorage } from '@extension/shared';
import { languageStorage } from '@extension/storage';
import { useState, useEffect } from 'react';

interface VocabularyFormProps {
  onAddItem: (item: { text: string; language: string }) => void;
}

export const VocabularyForm = ({ onAddItem }: VocabularyFormProps) => {
  const { targetLearningLanguage } = useStorage(languageStorage);
  const [newItemText, setNewItemText] = useState('');
  const [newItemLanguage, setNewItemLanguage] = useState(targetLearningLanguage || 'en-US');
  const [showLanguageMismatchPrompt, setShowLanguageMismatchPrompt] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ text: string; language: string } | null>(null);

  // Update language when target learning language changes
  useEffect(() => {
    if (targetLearningLanguage) {
      setNewItemLanguage(targetLearningLanguage);
    }
  }, [targetLearningLanguage]);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const normalizedSelectedLang = normalizeLanguageCode(newItemLanguage);
    const normalizedTargetLang = normalizeLanguageCode(targetLearningLanguage || 'en-US');

    // Check for language mismatch
    if (normalizedSelectedLang !== normalizedTargetLang) {
      setPendingItem({ text: newItemText.trim(), language: newItemLanguage });
      setShowLanguageMismatchPrompt(true);
      return;
    }

    // Language matches, proceed
    onAddItem({ text: newItemText.trim(), language: newItemLanguage });
    setNewItemText('');
  };

  const handleConfirmLanguageChange = async () => {
    if (!pendingItem) return;
    await languageStorage.setTargetLearningLanguage(normalizeLanguageCode(pendingItem.language));
    setNewItemLanguage(pendingItem.language);
    onAddItem(pendingItem);
    setNewItemText('');
    setPendingItem(null);
    setShowLanguageMismatchPrompt(false);
  };

  const handleAddAnyway = () => {
    if (!pendingItem) return;
    onAddItem(pendingItem);
    setNewItemText('');
    setPendingItem(null);
    setShowLanguageMismatchPrompt(false);
  };

  return (
    <>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="New word or phrase"
          className={cn('flex-1', input())}
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAddItem();
          }}
        />
        <select
          className={cn('w-32', select())}
          value={newItemLanguage}
          onChange={e => setNewItemLanguage(e.target.value)}>
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <button onClick={handleAddItem} className={button()}>
          Add
        </button>
      </div>

      {/* Language Mismatch Prompt Dialog */}
      {showLanguageMismatchPrompt && pendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className={cn(
              'mx-4 w-full max-w-md rounded-lg border p-6 shadow-xl',
              'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
            )}>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Language Mismatch Detected</h3>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              You're adding a word in{' '}
              <strong>{getLanguageDisplayName(normalizeLanguageCode(pendingItem.language))}</strong>, but your target
              learning language is{' '}
              <strong>{getLanguageDisplayName(normalizeLanguageCode(targetLearningLanguage || 'en-US'))}</strong>.
              <br />
              <br />
              Would you like to change your target learning language to{' '}
              <strong>{getLanguageDisplayName(normalizeLanguageCode(pendingItem.language))}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddAnyway}
                className={cn(
                  'flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                  'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                )}>
                Add Anyway
              </button>
              <button
                type="button"
                onClick={handleConfirmLanguageChange}
                className={cn(
                  'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                  'bg-blue-600 hover:bg-blue-700',
                  'dark:bg-blue-700 dark:hover:bg-blue-600',
                )}>
                Change Target Language
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
