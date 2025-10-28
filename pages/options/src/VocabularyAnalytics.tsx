import { analyzeText, summarizeVocabulary, formatVocabularyForAI } from '@extension/api';
import { LANGUAGES } from '@extension/shared';
import { getAllVocabularyForSummary, filterVocabulary } from '@extension/sqlite';
import { LoadingSpinner, QueryInterface, TextEvaluator, Tabs, VocabularyStats, cn } from '@extension/ui';
import { useState } from 'react';
import type { TextEvaluationResult } from '@extension/api';
import type { VocabularyItem } from '@extension/sqlite';

interface VocabularyAnalyticsProps {
  isLight: boolean;
}

export const VocabularyAnalytics = ({ isLight }: VocabularyAnalyticsProps) => {
  const [allVocabulary, setAllVocabulary] = useState<VocabularyItem[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<TextEvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (query: string, language?: string) => {
    setIsLoading(true);
    setError(null);
    setAiSummary(null);

    try {
      // Get all vocabulary for statistics and summary
      const allVocab = await getAllVocabularyForSummary();
      setAllVocabulary(allVocab);

      // Filter if language is specified
      const vocabulary = language ? await filterVocabulary({ language }) : allVocab;

      // Generate AI summary
      const formattedData = formatVocabularyForAI(vocabulary);
      const enhancedQuery = language
        ? `${query} (Keep response under 100 words, focus on ${LANGUAGES.find(l => l.value === language)?.label || language} vocabulary only)`
        : `${query} (Keep response under 150 words, be brief)`;

      const aiResponse = await summarizeVocabulary(enhancedQuery, formattedData);

      if (aiResponse.error) {
        setError(aiResponse.error);
      } else {
        setAiSummary(aiResponse.text);
      }
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
      // Get vocabulary for the selected language using the new filter function
      const vocabulary = await filterVocabulary({ language });
      const result = analyzeText(text, vocabulary);
      setTextResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze text');
    } finally {
      setIsLoading(false);
    }
  };

  const insightsTabContent = (
    <div className="h-full overflow-y-auto">
      <div className={cn('space-y-6 p-6', isLight ? 'text-gray-900' : 'text-gray-100')}>
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

        <div>
          <h3 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            Ask About Your Vocabulary
          </h3>
          <QueryInterface
            isLight={isLight}
            onQuery={handleQuery}
            isLoading={isLoading}
            availableLanguages={[...LANGUAGES]}
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="min-h-fit" />
          </div>
        )}

        {aiSummary && (
          <div className="space-y-4 border-t pt-6" style={{ borderColor: isLight ? '#e5e7eb' : '#374151' }}>
            <div>
              <h3 className={cn('mb-3 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>Summary</h3>
              <div
                className={cn(
                  'rounded-lg border p-4',
                  isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
                )}>
                <p className={cn('whitespace-pre-wrap text-sm', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  {aiSummary}
                </p>
              </div>
            </div>

            <VocabularyStats items={allVocabulary} isLight={isLight} />
          </div>
        )}
      </div>
    </div>
  );

  const textAnalysisTabContent = (
    <div className="h-full overflow-y-auto">
      <div className={cn('p-6', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <TextEvaluator isLight={isLight} onAnalyze={handleAnalyzeText} result={textResult} isAnalyzing={isLoading} />
      </div>
    </div>
  );

  const tabs = [
    { id: 'insights', label: 'AI Insights', content: insightsTabContent },
    { id: 'text-analysis', label: 'Text Analysis', content: textAnalysisTabContent },
  ];

  return (
    <div className={cn('flex h-3/5 flex-col', isLight ? 'text-gray-900' : 'text-gray-100')}>
      <div className="mb-6">
        <h2 className={cn('mb-2 text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          Vocabulary Analytics
        </h2>
        <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
          Get AI-powered insights about your vocabulary progress and analyze text comprehension
        </p>
      </div>

      <div className="flex-1">
        <Tabs tabs={tabs} isLight={isLight} defaultTabId="insights" />
      </div>
    </div>
  );
};
