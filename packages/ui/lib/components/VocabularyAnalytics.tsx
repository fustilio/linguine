import { LoadingSpinner } from './LoadingSpinner.js';
import { QueryInterface } from './QueryInterface.js';
import { TextEvaluator } from './TextEvaluator.js';
import { cn } from '@/lib/utils';
import { summarizeVocabulary, analyzeText, formatVocabularyForAI } from '@extension/api';
import { getAllVocabularyForSummary, getVocabularyByLanguage } from '@extension/sqlite';
import { useState } from 'react';
import type { AIResponse, TextEvaluationResult } from '@extension/api';

interface VocabularyAnalyticsProps {
  isLight: boolean;
}

export const VocabularyAnalytics = ({ isLight }: VocabularyAnalyticsProps) => {
  const [queryResult, setQueryResult] = useState<AIResponse | null>(null);
  const [textResult, setTextResult] = useState<TextEvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setQueryResult(null);

    try {
      // Get all vocabulary data
      const vocabulary = await getAllVocabularyForSummary();
      const formattedData = formatVocabularyForAI(vocabulary);

      // Send to AI
      const result = await summarizeVocabulary(query, formattedData);
      setQueryResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query vocabulary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeText = async (text: string, language: string) => {
    setIsLoading(true);
    setError(null);
    setTextResult(null);

    try {
      // Get vocabulary for the selected language
      const vocabulary = await getVocabularyByLanguage(language);
      const result = analyzeText(text, vocabulary);
      setTextResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze text');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex h-full flex-col gap-6', isLight ? 'text-gray-900' : 'text-gray-100')}>
      <div>
        <h2 className={cn('mb-2 text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          Vocabulary Analytics
        </h2>
        <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
          Get AI-powered insights about your vocabulary progress and analyze text comprehension
        </p>
      </div>

      {error && (
        <div
          className={cn(
            'rounded-lg border p-4',
            isLight ? 'border-red-200 bg-red-50 text-red-800' : 'border-red-900 bg-red-950 text-red-200',
          )}>
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Query Interface */}
        <div
          className={cn('rounded-lg border p-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800')}>
          <h3 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            Ask About Your Vocabulary
          </h3>
          <QueryInterface isLight={isLight} onQuery={handleQuery} isLoading={isLoading} />
        </div>

        {/* Query Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {queryResult && (
          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <h3 className={cn('mb-3 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
              AI Response
            </h3>
            {queryResult.error ? (
              <p className={cn('text-sm', isLight ? 'text-red-600' : 'text-red-400')}>{queryResult.error}</p>
            ) : (
              <div
                className={cn('whitespace-pre-wrap text-sm', isLight ? 'text-gray-700' : 'text-gray-300')}
                dangerouslySetInnerHTML={{ __html: queryResult.text }}></div>
            )}
          </div>
        )}

        {/* Text Evaluator */}
        <TextEvaluator isLight={isLight} onAnalyze={handleAnalyzeText} result={textResult} isAnalyzing={isLoading} />
      </div>
    </div>
  );
};

