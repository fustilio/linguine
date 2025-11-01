import { translateText, chromeAIManager } from '../chrome-ai/convenience-functions.js';
import { useStorage } from '@extension/shared';
import { languageStorage } from '@extension/storage';
import { useQuery } from '@tanstack/react-query';
import type { VocabularyItem } from '../vocabulary-api.js';

interface CardBackData {
  translation: string;
  exampleUsage: string;
}

const generateTranslation = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<string> => {
  try {
    // If source and target are the same, return the text as-is
    if (sourceLanguage === targetLanguage) {
      return text;
    }
    return await translateText(text, sourceLanguage, targetLanguage);
  } catch (error) {
    console.error('Failed to translate vocabulary item:', error);
    return text; // Fallback to original text
  }
};

const generateExampleUsage = async (word: string, language: string): Promise<string> => {
  try {
    const aiManager = chromeAIManager;
    // getMainSession automatically initializes if needed
    const session = await aiManager.getMainSession();
    const model = session.model;

    const prompt = `Provide a simple, natural example sentence using the word "${word}" in ${language}. Keep it short and practical. Provide only the sentence, nothing else.`;

    const response = await model.prompt(prompt, {});
    return response.trim();
  } catch (error) {
    console.error('Failed to generate example usage:', error);
    // Return a fallback message instead of empty string
    return `[Unable to generate example for "${word}"]`;
  }
};

const fetchCardBackData = async (item: VocabularyItem | null, targetLanguage: string | null): Promise<CardBackData> => {
  if (!item || !targetLanguage) {
    return { translation: '', exampleUsage: '' };
  }

  const sourceLanguage = item.language;

  // Generate translation and example usage in parallel
  const [translation, exampleUsage] = await Promise.all([
    generateTranslation(item.text, sourceLanguage, targetLanguage),
    generateExampleUsage(item.text, sourceLanguage),
  ]);

  return { translation, exampleUsage };
};

export const useVocabularyCardBack = (item: VocabularyItem | null) => {
  const { targetLearningLanguage } = useStorage(languageStorage);

  const {
    data: cardBackData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vocabularyCardBack', item?.id, targetLearningLanguage],
    queryFn: () => fetchCardBackData(item, targetLearningLanguage || null),
    enabled: !!item && !!targetLearningLanguage,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  return {
    translation: cardBackData?.translation || '',
    exampleUsage: cardBackData?.exampleUsage || '',
    isLoading,
    error,
  };
};
