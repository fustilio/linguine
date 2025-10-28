/**
 * Base wrapper around Chrome AI APIs
 * Provides low-level access to Chrome's built-in AI capabilities
 */

import type {
  AISummarizer,
  AITranslator,
  AILanguageModel,
  AIAvailability as ChromeAIAvailability,
} from './chrome-extended-types.js';

export type AIAvailability = ChromeAIAvailability;

/**
 * Check if Chrome AI API is available
 */
export const checkAIAvailability = async (): Promise<AIAvailability> => {
  try {
    if (typeof window === 'undefined') {
      return 'unavailable';
    }

    // Chrome AI APIs are available at window.vai (variable AI)
    const windowWithAI = window as unknown as Record<string, unknown>;

    if (!windowWithAI.vai) {
      return 'unavailable';
    }

    // Check for language model capabilities
    if (typeof chrome !== 'undefined' && chrome.ai) {
      // Check if Rewriter API is available
      if (typeof window.Rewriter !== 'undefined') {
        const result = await window.Rewriter.availability();
        return result;
      }
    }

    // Fallback: if window.vai exists, consider it available
    return 'available';
  } catch (error) {
    console.error('Failed to check AI availability:', error);
    return 'unavailable';
  }
};

/**
 * Initialize Chrome languageModel API (Prompt API)
 */
export const createLanguageModel = async (): Promise<AILanguageModel> => {
  try {
    if (!chrome?.ai) {
      throw new Error('Chrome AI API is not available');
    }

    if (!chrome.ai.languageModel) {
      throw new Error('Language Model API not available. Enable #prompt-api-for-gemini-nano flag');
    }

    const model = await chrome.ai.languageModel.create({
      // Using default Gemini model
    });
    return model;
  } catch (error) {
    console.error('Failed to initialize language model:', error);
    throw error;
  }
};

/**
 * Initialize Chrome Translator API
 */
export const createTranslator = async (sourceLanguage: string, targetLanguage: string): Promise<AITranslator> => {
  try {
    if (typeof Translator === 'undefined') {
      // Fallback to window.vai if available
      const windowWithAI = window as unknown as {
        vai?: {
          translator?: {
            availability: (opts: { sourceLanguage: string; targetLanguage: string }) => Promise<ChromeAIAvailability>;
            create: (opts: { sourceLanguage: string; targetLanguage: string }) => Promise<AITranslator>;
          };
        };
      };
      if (windowWithAI.vai?.translator) {
        const availability = await windowWithAI.vai.translator.availability({
          sourceLanguage,
          targetLanguage,
        });

        if (availability === 'unavailable') {
          throw new Error('Translation unavailable for this language pair');
        }

        return await windowWithAI.vai.translator.create({
          sourceLanguage,
          targetLanguage,
        });
      }
      throw new Error('Translator API not available. Enable #translator-api flag');
    }

    // Use global Translator API
    const availability = await Translator.availability({
      sourceLanguage,
      targetLanguage,
    });

    if (availability === 'unavailable') {
      throw new Error('Translation unavailable for this language pair');
    }

    return await Translator.create({
      sourceLanguage,
      targetLanguage,
    });
  } catch (error) {
    console.error('Failed to initialize translator:', error);
    throw error;
  }
};

/**
 * Initialize Chrome Summarizer API
 */
export const createSummarizer = async (): Promise<AISummarizer> => {
  try {
    if (typeof Summarizer === 'undefined') {
      throw new Error('Summarizer API not available. Enable #summarization-api-for-gemini-nano flag');
    }

    return await Summarizer.create({});
  } catch (error) {
    console.error('Failed to initialize summarizer:', error);
    throw error;
  }
};

/**
 * Translate text using Chrome Translator API
 */
export const translateText = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<string> => {
  const translator = await createTranslator(sourceLanguage, targetLanguage);

  // Wait for translator to be ready
  await translator.ready;

  const translated = await translator.translate(text);

  // Clean up
  translator.destroy();

  return translated;
};

/**
 * Summarize text using Chrome Summarizer API
 */
export const summarizeText = async (text: string, context?: string): Promise<string> => {
  const summarizer = await createSummarizer();

  // Wait for summarizer to be ready
  await summarizer.ready;

  const summary = await summarizer.summarize(text, context ? { context } : undefined);

  // Clean up
  summarizer.destroy();

  return summary;
};

/**
 * Stream summarize text using Chrome Summarizer API
 */
export const streamSummarizeText = async (text: string, context?: string): Promise<AsyncIterable<string>> => {
  const summarizer = await createSummarizer();

  // Wait for summarizer to be ready
  await summarizer.ready;

  return summarizer.summarizeStreaming(text, context ? { context } : undefined);
};
