/**
 * Token chunking using Intl.Segmenter (no AI)
 */

import type { POSChunk, SupportedLanguage } from './types.js';

// Simple in-memory cache for POS results within a page session
const posCache: Map<string, POSChunk[]> = new Map();

const cacheKey = (text: string, language: SupportedLanguage) => `${language}::${text}`;

/**
 * Chunks text into word-like tokens using Intl.Segmenter when available.
 */
const chunkTextWithPOS = async (text: string, language: SupportedLanguage): Promise<POSChunk[]> => {
  console.log(`[TextAnnotate] chunkTextWithPOS: "${text.substring(0, 50)}..." (${language})`);
  const key = cacheKey(text, language);
  if (posCache.has(key)) {
    return posCache.get(key)!;
  }

  // Fast path: very short strings → single token
  if (text.trim().length <= 5) {
    const quick = fallbackWordChunking(text, language);
    posCache.set(key, quick);
    return quick;
  }

  // Use built-in Intl.Segmenter for supported languages to avoid AI latency
  if (typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === 'function') {
    try {
      const base = String(language).split('-')[0] || 'en';
      type SegRecord = { segment: string; index: number; isWordLike?: boolean };
      const SegmenterCtor = (
        Intl as unknown as {
          Segmenter: new (
            loc: string,
            opts: { granularity: 'word' },
          ) => { segment: (t: string) => Iterable<SegRecord> };
        }
      ).Segmenter;
      const segmenter = new SegmenterCtor(base, { granularity: 'word' });
      const chunks: POSChunk[] = [];
      // Iterate word segments to compute positions
      const iterable = segmenter.segment(text);
      for (const seg of iterable as Iterable<SegRecord>) {
        const segStr = seg.segment;
        const segStart = seg.index;
        const segEnd: number = segStart + segStr.length;
        if (seg.isWordLike === false) {
          // Preserve spaces/punct by skipping annotation but maintaining positions if needed later
          continue;
        }
        if (segStr.trim().length === 0) {
          continue;
        }
        chunks.push({
          text: segStr,
          type: 'single_word',
          start: segStart,
          end: segEnd,
          language,
        });
      }
      posCache.set(key, chunks);
      return chunks;
    } catch (err) {
      console.warn('[TextAnnotate] Intl.Segmenter not available or failed, falling back:', err);
      const fb = fallbackWordChunking(text, language);
      posCache.set(key, fb);
      return fb;
    }
  }
  // Final fallback: whitespace/character-based segmentation
  const fb = fallbackWordChunking(text, language);
  posCache.set(key, fb);
  return fb;
};

/**
 * Fallback word-based chunking when AI fails
 */
const fallbackWordChunking = (text: string, language: SupportedLanguage): POSChunk[] => {
  const chunks: POSChunk[] = [];
  let currentPos = 0;

  // Handle different languages
  if (language === 'zh-CN') {
    // Chinese: character-based
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char.trim()) {
        chunks.push({
          text: char,
          type: 'single_word',
          start: i,
          end: i + 1,
          language,
        });
      }
      currentPos = i + 1;
    }
  } else {
    // Other languages: word-based
    const words = text.split(/(\s+)/);

    for (const word of words) {
      if (word.trim()) {
        chunks.push({
          text: word.trim(),
          type: 'single_word',
          start: currentPos,
          end: currentPos + word.length,
          language,
        });
      }
      currentPos += word.length;
    }
  }

  return chunks;
};

export { chunkTextWithPOS };
