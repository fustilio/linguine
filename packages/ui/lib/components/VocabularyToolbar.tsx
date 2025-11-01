import { cn } from '@/lib/utils';
import { LANGUAGES } from '@extension/shared/const';
import { Info } from 'lucide-react';

interface VocabularyToolbarProps {
  showMetadata?: boolean;
  onToggleMetadata?: () => void;
  languageFilter?: string | null;
  onLanguageChange?: (language: string | null) => void;
}

export const VocabularyToolbar = ({
  showMetadata = false,
  onToggleMetadata,
  languageFilter,
  onLanguageChange,
}: VocabularyToolbarProps) => (
  <div className="mb-4 flex items-center justify-end gap-2">
    {onToggleMetadata && (
      <button
        type="button"
        onClick={onToggleMetadata}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
          'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
          'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
          showMetadata && 'bg-gray-100 dark:bg-gray-600',
        )}
        title={showMetadata ? 'Hide metadata' : 'Show metadata'}>
        <Info size={16} />
        <span>Metadata</span>
      </button>
    )}
    {onLanguageChange && (
      <select
        className={cn(
          'w-40 rounded border px-3 py-2',
          'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100',
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
    )}
  </div>
);
