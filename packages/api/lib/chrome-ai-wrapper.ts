/// <reference types="dom-chromium-ai" />

/**
 * Base wrapper around Chrome AI APIs
 * Provides low-level access to Chrome's built-in AI capabilities
 */


/**
 * Initialize Chrome languageModel API (Prompt API)
 */
export const createLanguageModel = async () => {
  try {
 
    if (typeof LanguageModel === 'undefined') {
      throw new Error('Language Model API not available. Enable #prompt-api-for-gemini-nano flag');
    }

    const availability = await LanguageModel.availability();

    if (availability === 'unavailable') {
      throw new Error('Language Model API not available. Enable #prompt-api-for-gemini-nano flag');
    }

    return await LanguageModel.create({});
  } catch (error) {
    console.error('Failed to initialize language model:', error);
    throw error;
  }
};

/**
 * Initialize Chrome Translator API
 */
export const createTranslator = async (sourceLanguage: string, targetLanguage: string) => {
  try {
    if (typeof Translator === 'undefined') {
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
export const createSummarizer = async () => {
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
export const translateText = async (text: string, sourceLanguage: string, targetLanguage: string) => {
  const translator = await createTranslator(sourceLanguage, targetLanguage);

  // Wait for translator to be ready
  // await translator.ready;

  const translated = await translator.translate(text);

  // Clean up
  translator.destroy();

  return translated;
};

/**
 * Summarize text using Chrome Summarizer API
 */
export const summarizeText = async (text: string, context?: string) => {
  const summarizer = await createSummarizer();

  // Wait for summarizer to be ready
  // await summarizer.ready;

  const summary = await summarizer.summarize(text, context ? { context } : undefined);

  // Clean up
  summarizer.destroy();

  return summary;
};

/**
 * Stream summarize text using Chrome Summarizer API
 */
export const streamSummarizeText = async (text: string, context?: string) => {
  const summarizer = await createSummarizer();

  // Wait for summarizer to be ready
  // await summarizer.ready;

  return summarizer.summarizeStreaming(text, context ? { context } : undefined);
};
