/**
 * Simple annotator for testing reading mode UI
 * Doesn't use Chrome AI APIs to avoid user gesture requirements
 */

import { detectLanguageFromText } from './language-detector.js';
import { extractPlainText } from './text-extractor.js';
import type { AnnotatedChunk, AnnotationResult, ExtractedText, SupportedLanguage } from './types.js';

/**
 * Simple text annotation without AI APIs
 */
const simpleAnnotateText = async (
  extractedText: ExtractedText,
  targetLanguage: SupportedLanguage = 'en-US',
  onProgress?: (chunks: AnnotatedChunk[], isComplete: boolean, totalChunks?: number) => void,
): Promise<AnnotationResult> => {
  console.log('[TextAnnotate] simpleAnnotateText started');
  const plainText = extractPlainText(extractedText.content);
  console.log('[TextAnnotate] Simple annotator - plain text length:', plainText.length);

  // Detect source language
  const detectedLanguage = extractedText.language
    ? normalizeLanguageCode(extractedText.language)
    : (await detectLanguageFromText(plainText)) || targetLanguage;

  // Simple word-based chunking for testing
  console.log('[TextAnnotate] Simple annotator - creating word chunks...');
  const chunks: AnnotatedChunk[] = [];
  const words = plainText.split(/(\s+)/);
  let currentPos = 0;
  console.log('[TextAnnotate] Simple annotator - words to process:', words.length);

  for (const word of words) {
    if (word.trim().length > 0) {
      chunks.push({
        text: word.trim(),
        type: 'single_word',
        start: currentPos,
        end: currentPos + word.length,
        language: detectedLanguage,
        translation: {
          literal: `[${detectedLanguage}] ${word.trim()}`,
          contextual: `Translation of "${word.trim()}"`,
          differs: Math.random() > 0.7, // Randomly show differences for testing
        },
      });
    }
    currentPos += word.length;
  }

  console.log('[TextAnnotate] Simple annotator - created chunks:', chunks.length);

  // Send final progress update
  if (onProgress) {
    onProgress(chunks, true, chunks.length);
  }

  return {
    text: plainText,
    chunks,
    detectedLanguage,
  };
};

/**
 * Normalize language code
 */
const normalizeLanguageCode = (lang: string | undefined): SupportedLanguage => {
  if (!lang) return 'en-US';

  const normalized = lang.toLowerCase().trim();

  const languageMap: Record<string, SupportedLanguage> = {
    zh: 'zh-CN',
    'zh-cn': 'zh-CN',
    'zh-hans': 'zh-CN',
    th: 'th-TH',
    'th-th': 'th-TH',
    en: 'en-US',
    'en-us': 'en-US',
    es: 'es-ES',
    'es-es': 'es-ES',
    fr: 'fr-FR',
    'fr-fr': 'fr-FR',
    de: 'de-DE',
    'de-de': 'de-DE',
    ja: 'ja-JP',
    'ja-jp': 'ja-JP',
    ko: 'ko-KR',
    'ko-kr': 'ko-KR',
  };

  return languageMap[normalized] || 'en-US';
};

export { simpleAnnotateText };
