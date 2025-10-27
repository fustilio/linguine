import { cn } from '@extension/ui';
import { useState } from 'react';

const languages = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ko-KR', label: 'Korean' },
];

interface VocabularyFormProps {
  onAddItem: (item: { text: string; language: string }) => void;
  isLight: boolean;
}

export const VocabularyForm = ({ onAddItem, isLight }: VocabularyFormProps) => {
  const [newItemText, setNewItemText] = useState('');
  const [newItemLanguage, setNewItemLanguage] = useState('en-US');

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    onAddItem({ text: newItemText.trim(), language: newItemLanguage });
    setNewItemText('');
  };

  return (
    <div className="mb-4 flex gap-2">
      <input
        type="text"
        placeholder="New word or phrase"
        className={cn(
          'flex-1 rounded border px-3 py-2',
          isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100',
        )}
        value={newItemText}
        onChange={e => setNewItemText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleAddItem();
        }}
      />
      <select
        className={cn(
          'w-32 rounded border px-3 py-2',
          isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100',
        )}
        value={newItemLanguage}
        onChange={e => setNewItemLanguage(e.target.value)}>
        {languages.map(lang => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <button onClick={handleAddItem} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
        Add
      </button>
    </div>
  );
};
