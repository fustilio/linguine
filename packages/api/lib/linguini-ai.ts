/**
 * Vocabulary-specific AI functionality
 * Uses Chrome AI APIs for vocabulary analysis and insights
 */

import { createLanguageModel, translateText } from './chrome-ai-wrapper.js';
import { FunctionCallingPromptAPI } from './function-calling/function-calling-api.js';
import { z } from 'zod';
import type {
  VocabularyAnalysisResult,
  TextEvaluationResult,
  CEFRLevel,
  AIResponse,
  VocabularyFilterSpec,
} from './types.js';
import type { VocabularyItem } from '@extension/sqlite';

/**
 * Analyze a chunk of text against known vocabulary
 */
const analyzeText = (text: string, knownWords: VocabularyItem[]): TextEvaluationResult => {
  const words = text.toLowerCase().split(/\s+/);

  const breakdown: VocabularyAnalysisResult[] = [];
  let knownWordsCount = 0;
  let unknownWordsCount = 0;
  let strugglingWordsCount = 0;
  let masteredWordsCount = 0;

  // Create a map of known words by lowercased text
  const knownWordsMap = new Map<string, VocabularyItem>();
  for (const word of knownWords) {
    const key = word.text.toLowerCase();
    knownWordsMap.set(key, word);
  }

  for (const word of words) {
    // Remove punctuation
    const cleanWord = word.replace(/[^\w]/g, '');

    if (!cleanWord) continue;

    const knownWord = knownWordsMap.get(cleanWord);

    if (knownWord) {
      knownWordsCount++;
      breakdown.push({
        text: cleanWord,
        knowledgeLevel: knownWord.knowledge_level,
        isKnown: true,
        matchType: 'exact',
      });

      if (knownWord.knowledge_level >= 4) {
        masteredWordsCount++;
      } else if (knownWord.knowledge_level <= 2) {
        strugglingWordsCount++;
      }
    } else {
      unknownWordsCount++;
      breakdown.push({
        text: cleanWord,
        knowledgeLevel: 0,
        isKnown: false,
        matchType: 'unknown',
      });
    }
  }

  const totalWords = breakdown.length;
  const knownPercentage = totalWords > 0 ? (knownWordsCount / totalWords) * 100 : 0;

  return {
    totalWords,
    knownWords: knownWordsCount,
    unknownWords: unknownWordsCount,
    strugglingWords: strugglingWordsCount,
    masteredWords: masteredWordsCount,
    knownPercentage,
    breakdown,
  };
};

// Schema for vocabulary filter parameters
const VocabularyFilterSchema = z.object({
  language: z.enum(['en-US', 'ja-JP', 'es-ES', 'fr-FR', 'de-DE', 'ko-KR']).optional(),
  knowledgeLevel: z
    .object({
      min: z.number().min(1).max(5).optional(),
      max: z.number().min(1).max(5).optional(),
      levels: z.array(z.number().min(1).max(5)).optional(),
    })
    .optional(),
});

type VocabularyFilterParams = z.infer<typeof VocabularyFilterSchema>;

/**
 * Create and configure a vocabulary query parser using function calling
 */
let vocabularyQueryParser: FunctionCallingPromptAPI | null = null;

const createVocabularyQueryParser = (): FunctionCallingPromptAPI => {
  if (vocabularyQueryParser) return vocabularyQueryParser;

  const parser = new FunctionCallingPromptAPI({
    enableLogging: false,
    maxRetries: 2,
  });

  // Register the filter function
  parser.registerFunction({
    name: 'apply_vocabulary_filter',
    description:
      'Apply filters to vocabulary data based on language and knowledge level. Knowledge levels: 1-2=Struggling, 3=Learning, 4-5=Mastered. Available languages: en-US, ja-JP, es-ES, fr-FR, de-DE, ko-KR',
    parameters: VocabularyFilterSchema,
    returns: z.any(),
    execute: (params: VocabularyFilterParams) => {
      const filterSpec: VocabularyFilterSpec = {
        query: 'filtered vocabulary',
      };

      if (params.language) {
        filterSpec.language = params.language;
      }

      if (params.knowledgeLevel) {
        filterSpec.knowledgeLevel = params.knowledgeLevel;
      }

      return filterSpec;
    },
  });

  vocabularyQueryParser = parser;
  return parser;
};

/**
 * Parse user query and return filter specifications for vocabulary data
 * Uses function calling for more reliable structured output
 */
const parseVocabularyQuery = async (prompt: string): Promise<VocabularyFilterSpec> => {
  try {
    const parser = createVocabularyQueryParser();

    // Initialize session if needed (only first time)
    if (!vocabularyQueryParser) {
      await parser.initializeSession(
        () => {},
        'You are a helpful assistant that helps users filter vocabulary data. Call the apply_vocabulary_filter function when the user wants to filter vocabulary.',
      );
    }

    // Generate response
    const message = await parser.generate(prompt);

    // Check if a function was called
    if (message.parsed?.function === 'apply_vocabulary_filter' && message.parsed.functionResult) {
      return message.parsed.functionResult as VocabularyFilterSpec;
    }

    // If no function was called, return the query as is
    return { query: prompt };
  } catch (error) {
    console.error('Failed to parse vocabulary query:', error);
    return { query: prompt };
  }
};

/**
 * Summarize vocabulary data using AI (Language Model / Prompt API)
 */
const summarizeVocabulary = async (prompt: string, vocabularyData: string): Promise<AIResponse> => {
  try {
    const model = await createLanguageModel();

    const systemInstructions = `You are a vocabulary analysis assistant. Keep responses concise, structured, and actionable.
- Use bullet points when listing items
- Highlight key insights in 1-2 sentences
- Focus on practical recommendations
- Be specific with numbers and examples
- Avoid lengthy introductions or redundant information`;

    const fullPrompt = `${systemInstructions}\n\nQuestion: ${prompt}\n\nVocabulary data:\n${vocabularyData}`;

    const response = await model.prompt(fullPrompt, {});

    return { text: response };
  } catch (error) {
    console.error('Failed to summarize vocabulary:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Failed to summarize vocabulary',
    };
  }
};

/**
 * Estimate CEFR level based on vocabulary
 */
const estimateCEFRLevel = async (vocabularyData: string): Promise<CEFRLevel> => {
  try {
    const model = await createLanguageModel();

    const prompt = `Based on the following vocabulary data, estimate the user's CEFR language proficiency level (A1, A2, B1, B2, C1, or C2). Analyze the total number of words, distribution of knowledge levels, and provide a brief explanation.

Vocabulary data:
${vocabularyData}

Respond in this exact JSON format:
{
  "level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "confidence": "High" | "Medium" | "Low",
  "explanation": "brief explanation here"
}`;

    const response = await model.prompt(prompt, {});

    // Try to parse JSON from the response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as CEFRLevel;
      }
    } catch {
      // Fall through to default
    }

    // Parse text-based response as fallback
    const levelMatch = response.match(/(A[12]|B[12]|C[12])/i);
    const level = levelMatch ? (levelMatch[0].toUpperCase() as CEFRLevel['level']) : 'Unknown';

    return {
      level,
      confidence: 'Low',
      explanation: response,
    };
  } catch (e) {
    console.error('Failed to estimate CEFR level:', e);

    // Simple heuristic as fallback
    const words = vocabularyData.match(/\b\w+\b/g) || [];
    const totalWords = words.length;

    let level: CEFRLevel['level'] = 'Unknown';
    let confidence: CEFRLevel['confidence'] = 'Low';

    if (totalWords < 500) {
      level = 'A1';
      confidence = 'Medium';
    } else if (totalWords < 1000) {
      level = 'A2';
      confidence = 'Medium';
    } else if (totalWords < 2000) {
      level = 'B1';
      confidence = 'Medium';
    } else if (totalWords < 4000) {
      level = 'B2';
      confidence = 'Medium';
    } else if (totalWords < 8000) {
      level = 'C1';
      confidence = 'Medium';
    } else {
      level = 'C2';
      confidence = 'Medium';
    }

    return {
      level,
      confidence,
      explanation: `Estimated based on ${totalWords} known words`,
    };
  }
};

/**
 * Format vocabulary data for AI consumption
 */
const formatVocabularyForAI = (vocabulary: VocabularyItem[]): string => {
  const byLanguage = new Map<string, VocabularyItem[]>();

  // Group by language
  for (const item of vocabulary) {
    if (!byLanguage.has(item.language)) {
      byLanguage.set(item.language, []);
    }
    byLanguage.get(item.language)!.push(item);
  }

  const parts: string[] = [];

  // Helper to format word lists with limits
  const formatWordList = (words: string[], maxWords = 10): string => {
    if (words.length <= maxWords) {
      return words.join(', ');
    }
    return `${words.slice(0, maxWords).join(', ')}... (${words.length} total)`;
  };

  for (const [language, items] of Array.from(byLanguage.entries())) {
    // Group by knowledge level
    const level1to2: string[] = [];
    const level3: string[] = [];
    const level4to5: string[] = [];

    for (const item of items) {
      if (item.knowledge_level <= 2) {
        level1to2.push(item.text);
      } else if (item.knowledge_level === 3) {
        level3.push(item.text);
      } else {
        level4to5.push(item.text);
      }
    }

    parts.push(`Language: ${language}`);
    if (level1to2.length > 0) {
      parts.push(`Struggling (${level1to2.length}): ${formatWordList(level1to2)}`);
    }
    if (level3.length > 0) {
      parts.push(`Learning (${level3.length}): ${formatWordList(level3)}`);
    }
    if (level4to5.length > 0) {
      parts.push(`Mastered (${level4to5.length}): ${formatWordList(level4to5)}`);
    }
    parts.push(`Total: ${items.length} words\n`);
  }

  return parts.join('\n');
};

/**
 * Translate word definitions using Chrome Translator API
 * Returns a wrapper with AIResponse format
 */
const translateVocabularyDefinition = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<AIResponse> => {
  try {
    const translated = await translateText(text, sourceLanguage, targetLanguage);
    return { text: translated };
  } catch (error) {
    console.error('Failed to translate text:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Failed to translate text',
    };
  }
};

// Export all functions at the end
export {
  analyzeText,
  parseVocabularyQuery,
  summarizeVocabulary,
  estimateCEFRLevel,
  formatVocabularyForAI,
  translateVocabularyDefinition,
};
