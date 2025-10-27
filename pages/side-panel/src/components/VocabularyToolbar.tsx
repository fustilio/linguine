import { LANGUAGES } from '@extension/shared/const';
import { cn } from '@extension/ui';

interface VocabularyToolbarProps {
  languageFilter: string | null;
  onLanguageChange: (language: string | null) => void;
  isLight: boolean;
}

export const VocabularyToolbar = ({ languageFilter, onLanguageChange, isLight }: VocabularyToolbarProps) => (
  <div className="mb-4 flex items-center justify-end">
    <select
      className={cn(
        'w-40 rounded border px-3 py-2',
        isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100',
      )}
      value={languageFilter || ''}
      onChange={e => onLanguageChange(e.target.value || null)}>
      <option value="">All Languages</option>
      {LANGUAGES.map(lang => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  </div>
);
