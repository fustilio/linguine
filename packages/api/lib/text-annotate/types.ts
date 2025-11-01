/**
 * Type definitions for the text annotate system
 */

import type { VocabularyMatch } from './vocabulary-matcher.js';

export type SupportedLanguage = 'zh-CN' | 'th-TH' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP' | 'ko-KR';

export type POSChunkType =
  | 'noun_phrase'
  | 'verb_phrase'
  | 'adjective_phrase'
  | 'adverb_phrase'
  | 'prepositional_phrase'
  | 'single_word';

/**
 * Represents a chunk of text with POS information
 */
export interface POSChunk {
  text: string;
  type: POSChunkType;
  start: number;
  end: number;
  language?: SupportedLanguage;
}

/**
 * Translation information for a chunk
 */
export interface ChunkTranslation {
  literal: string;
  contextual: string;
  differs: boolean; // true if literal and contextual translations differ
}

/**
 * Annotated chunk ready for display
 */
export interface AnnotatedChunk extends POSChunk {
  translation: ChunkTranslation;
  imageUrls?: string[];
  vocabularyMatch?: VocabularyMatch | null;
}

/**
 * Text extraction result
 */
export interface ExtractedText {
  title?: string;
  byline?: string;
  content: string; // Clean HTML content
  language?: string;
  siteName?: string;
}

/**
 * Text annotation result
 */
export interface AnnotationResult {
  text: string;
  chunks: AnnotatedChunk[];
  detectedLanguage?: SupportedLanguage;
  isSimplifyMode?: boolean; // true when both source and target are English (using Rewriter instead of Translator)
}

/**
 * Reading mode configuration
 */
export interface ReadingModeConfig {
  extractionMode: 'auto' | 'manual' | 'selector';
  selector?: string; // For manual selector mode
  selectedText?: string; // For manual text mode
  targetLanguage?: SupportedLanguage; // Target language for translation (defaults to 'en-US')
}
