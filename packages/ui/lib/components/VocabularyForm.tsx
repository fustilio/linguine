import { button, input, select } from './common-styles';
import { cn } from '@/lib/utils';
import { LANGUAGES } from '@extension/shared/const';
import { useState } from 'react';

interface VocabularyFormProps {
  onAddItem: (item: { text: string; language: string }) => void;
}

export const VocabularyForm = ({ onAddItem }: VocabularyFormProps) => {
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
        className={cn('flex-1', input())}
        value={newItemText}
        onChange={e => setNewItemText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleAddItem();
        }}
      />
      <select className={cn('w-32', select())} value={newItemLanguage} onChange={e => setNewItemLanguage(e.target.value)}>
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
  );
};
