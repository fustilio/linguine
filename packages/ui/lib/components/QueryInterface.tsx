import { cn } from '@/lib/utils';
import { useState } from 'react';

interface QueryInterfaceProps {
  onQuery: (query: string, language?: string) => void;
  isLoading?: boolean;
  availableLanguages?: Array<{ value: string; label: string }>;
}

const EXAMPLE_QUERIES = [
  'What words am I struggling with?',
  'Summarize my progress',
  'Give me study recommendations',
  'Which words should I focus on?',
  'What are my strengths?',
];

export const QueryInterface = ({
  onQuery,
  isLoading = false,
  availableLanguages = [],
}: QueryInterfaceProps) => {
  const [query, setQuery] = useState('');
  const [localHistory, setLocalHistory] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setLocalHistory(prev => [query, ...prev.slice(0, 9)]);
    onQuery(query, selectedLanguage === 'all' ? undefined : selectedLanguage);
    setQuery('');
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {availableLanguages.length > 0 && (
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            disabled={isLoading}
            className={cn(
              'rounded-lg border px-4 py-2 transition-colors focus:outline-none focus:ring-2',
              'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-500',
            )}>
            <option value="all">All Languages</option>
            {availableLanguages.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask about your vocabulary..."
            disabled={isLoading}
            className={cn(
              'flex-1 rounded-lg border px-4 py-2 transition-colors focus:outline-none focus:ring-2',
              'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-500',
            )}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={cn(
              'rounded-lg px-6 py-2 font-medium transition-colors disabled:opacity-50',
              'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
            )}>
            {isLoading ? 'Querying...' : 'Ask'}
          </button>
        </div>
      </form>

      <div>
        <p className={cn('mb-2 text-sm font-medium text-gray-700 dark:text-gray-300')}>Example queries:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((example, idx) => (
            <button
              key={idx}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition-colors',
                'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
              )}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {localHistory.length > 0 && (
        <div>
          <p className={cn('mb-2 text-sm font-medium text-gray-700 dark:text-gray-300')}>Recent queries:</p>
          <div className="space-y-1">
            {localHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(item)}
                disabled={isLoading}
                className={cn(
                  'block w-full rounded px-3 py-2 text-left text-sm transition-colors',
                  'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                )}>
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
