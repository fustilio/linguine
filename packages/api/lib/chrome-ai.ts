/**
 * Vocabulary-specific AI functionality
 * Uses Chrome AI APIs for vocabulary analysis and insights
 */

import { createLanguageModel, translateText } from './chrome-ai-wrapper.js';
import type { VocabularyAnalysisResult, TextEvaluationResult, CEFRLevel, AIResponse } from './types.js';
import type { VocabularyItem } from '@extension/sqlite';

/**
 * Analyze a chunk of text against known vocabulary
 */
export const analyzeText = (text: string, knownWords: VocabularyItem[]): TextEvaluationResult => {
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

/**
 * Summarize vocabulary data using AI (Language Model / Prompt API)
 */
export const summarizeVocabulary = async (prompt: string, vocabularyData: string): Promise<AIResponse> => {
  try {
    const model = await createLanguageModel();

    const fullPrompt = `${prompt}\n\nVocabulary data:\n${vocabularyData}`;

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
export const estimateCEFRLevel = async (vocabularyData: string): Promise<CEFRLevel> => {
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
export const formatVocabularyForAI = (vocabulary: VocabularyItem[]): string => {
  const byLanguage = new Map<string, VocabularyItem[]>();

  // Group by language
  for (const item of vocabulary) {
    if (!byLanguage.has(item.language)) {
      byLanguage.set(item.language, []);
    }
    byLanguage.get(item.language)!.push(item);
  }

  const parts: string[] = [];

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
      parts.push(`Level 1-2 (Struggling, ${level1to2.length} words): ${level1to2.join(', ')}`);
    }
    if (level3.length > 0) {
      parts.push(`Level 3 (Learning, ${level3.length} words): ${level3.join(', ')}`);
    }
    if (level4to5.length > 0) {
      parts.push(`Level 4-5 (Mastered, ${level4to5.length} words): ${level4to5.join(', ')}`);
    }
    parts.push(`Total: ${items.length} words\n`);
  }

  return parts.join('\n');
};

/**
 * Translate word definitions using Chrome Translator API
 * Returns a wrapper with AIResponse format
 */
export const translateVocabularyDefinition = async (
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
