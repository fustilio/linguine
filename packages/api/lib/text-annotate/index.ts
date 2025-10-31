/**
 * Text Annotate System
 * Main entry point for text annotation functionality
 */

export { TextAnnotateManager } from './text-annotate-manager.js';
export { annotateText } from './annotator.js';
export { extractContentWithReadability, extractSelectedText, extractTextBySelector } from './text-extractor.js';
export { detectLanguageFromText, normalizeLanguageCode } from './language-detector.js';
export { chunkTextWithPOS } from './pos-chunker.js';
export { translateChunk } from './translator.js';
export { segmentText } from './segmenter.js';
export { getReadingModeStyles } from './styles.js';
export { getImagesForQuery } from './image-fetcher.js';
export type {
  SupportedLanguage,
  POSChunk,
  POSChunkType,
  ChunkTranslation,
  AnnotatedChunk,
  ExtractedText,
  AnnotationResult,
  ReadingModeConfig,
} from './types.js';
