import { cn } from '@/lib/utils';
import { LANGUAGES } from '@extension/shared/const';
import { useState } from 'react';
import type { TextEvaluationResult } from '@extension/api';

interface TextEvaluatorProps {
  onAnalyze: (text: string, language: string) => void;
  result: TextEvaluationResult | null;
  isAnalyzing?: boolean;
}

export const TextEvaluator = ({ onAnalyze, result, isAnalyzing = false }: TextEvaluatorProps) => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en-US');

  const handleAnalyze = () => {
    if (!text.trim() || isAnalyzing) return;
    onAnalyze(text, language);
  };

  const getColorForLevel = (level: number): string => {
    if (level === 0) return 'bg-red-500/30 text-red-200';
    if (level <= 2) return 'bg-yellow-500/30 text-yellow-200';
    if (level <= 3) return 'bg-blue-500/30 text-blue-200';
    return 'bg-green-500/30 text-green-200';
  };

  return (
    <div
      className={cn(
        'space-y-4 rounded-lg border p-4',
        'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
      )}>
      <div>
        <h3 className={cn('mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100')}>
          Text Evaluator
        </h3>
        <p className={cn('mb-4 text-sm text-gray-600 dark:text-gray-400')}>
          Paste text and see which words you know, which you're struggling with, and which you've mastered.
        </p>

        <div className="mb-3">
          <label className={cn('mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300')}>
            Language:
          </label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={isAnalyzing}
            className={cn(
              'w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2',
              'border-gray-300 bg-white text-gray-900 focus:ring-blue-500',
              'dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-blue-500',
            )}>
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className={cn('mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300')}>
            Text to analyze:
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isAnalyzing}
            placeholder="Paste or type your text here..."
            rows={6}
            className={cn(
              'w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2',
              'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500',
              'dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-500',
            )}
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className={cn(
            'w-full rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50',
            'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
          )}>
          {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
        </button>
      </div>

      {result && (
        <div className={cn('space-y-3 rounded-lg border p-4 border-gray-200 dark:border-gray-600')}>
          <div>
            <h4 className={cn('mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100')}>Results</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total words:</span>
                <span className={cn('ml-2 font-medium text-gray-900 dark:text-gray-100')}>
                  {result.totalWords}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Known:</span>
                <span className={cn('ml-2 font-medium text-gray-900 dark:text-gray-100')}>
                  {result.knownWords} ({result.knownPercentage.toFixed(1)}%)
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Struggling:</span>
                <span className={cn('ml-2 font-medium text-gray-900 dark:text-gray-100')}>
                  {result.strugglingWords}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Mastered:</span>
                <span className={cn('ml-2 font-medium text-gray-900 dark:text-gray-100')}>
                  {result.masteredWords}
                </span>
              </div>
            </div>
          </div>

          <div className={cn('rounded border p-3 border-gray-200 dark:border-gray-600')}>
            <p className={cn('mb-2 text-xs font-medium text-gray-700 dark:text-gray-300')}>
              Word breakdown:
            </p>
            <div className="flex flex-wrap gap-1">
              {result.breakdown.map((item, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'rounded px-2 py-1 text-xs font-medium',
                    item.isKnown ? getColorForLevel(item.knowledgeLevel) : 'bg-red-500/30 text-red-200',
                  )}>
                  {item.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
