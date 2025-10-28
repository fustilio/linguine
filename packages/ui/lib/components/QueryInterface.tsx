import { cn } from '@/lib/utils';
import { useState } from 'react';

interface QueryInterfaceProps {
  isLight: boolean;
  onQuery: (query: string) => void;
  isLoading?: boolean;
}

const EXAMPLE_QUERIES = [
  'Summarize my vocabulary progress',
  'What words am I struggling with?',
  'Show me my recently learned words',
  "What's my English proficiency level?",
  'Give me a breakdown by language',
];

export const QueryInterface = ({ isLight, onQuery, isLoading = false }: QueryInterfaceProps) => {
  const [query, setQuery] = useState('');
  const [localHistory, setLocalHistory] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setLocalHistory(prev => [query, ...prev.slice(0, 9)]);
    onQuery(query);
    setQuery('');
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask about your vocabulary..."
            disabled={isLoading}
            className={cn(
              'flex-1 rounded-lg border px-4 py-2 transition-colors focus:outline-none focus:ring-2',
              isLight
                ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                : 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-blue-500',
            )}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={cn(
              'rounded-lg px-6 py-2 font-medium transition-colors disabled:opacity-50',
              isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-700 text-white hover:bg-blue-600',
            )}>
            {isLoading ? 'Querying...' : 'Ask'}
          </button>
        </div>
      </form>

      <div>
        <p className={cn('mb-2 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Example queries:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((example, idx) => (
            <button
              key={idx}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition-colors',
                isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
              )}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {localHistory.length > 0 && (
        <div>
          <p className={cn('mb-2 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Recent queries:</p>
          <div className="space-y-1">
            {localHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(item)}
                disabled={isLoading}
                className={cn(
                  'block w-full rounded px-3 py-2 text-left text-sm transition-colors',
                  isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-800',
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
