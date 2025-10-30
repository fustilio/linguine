/**
 * Text segmentation by language
 * Handles Thai (wordcut), Chinese (character-based), and others (word-based)
 */

import type { SupportedLanguage } from './types.js';
import { isChineseCharacter, isThaiCharacter } from './language-detector.js';

export interface TextSegment {
  text: string;
  start: number;
  end: number;
  isTargetLanguage: boolean;
}

/**
 * Segments text based on language
 */
export function segmentText(text: string, language: SupportedLanguage): TextSegment[] {
  switch (language) {
    case 'th-TH':
      return segmentThai(text);
    case 'zh-CN':
      return segmentChinese(text);
    default:
      return segmentWordBased(text, language);
  }
}

/**
 * Segments Thai text using wordcut
 */
function segmentThai(text: string): TextSegment[] {
  // For now, use fallback word-based segmentation
  // wordcut will be integrated when available
  return segmentWordBased(text, 'th-TH');
}

/**
 * Segments Chinese text character by character
 */
function segmentChinese(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentSegment = '';
  let currentStart = 0;
  let isCurrentChinese = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charCode = text.charCodeAt(i);
    const isChinese = isChineseCharacter(charCode);

    if (isChinese === isCurrentChinese && currentSegment.length > 0) {
      // Continue current segment
      currentSegment += char;
    } else {
      // Save previous segment if it exists
      if (currentSegment.length > 0) {
        segments.push({
          text: currentSegment,
          start: currentStart,
          end: currentStart + currentSegment.length,
          isTargetLanguage: isCurrentChinese,
        });
      }

      // Start new segment
      currentSegment = char;
      currentStart = i;
      isCurrentChinese = isChinese;
    }
  }

  // Add final segment
  if (currentSegment.length > 0) {
    segments.push({
      text: currentSegment,
      start: currentStart,
      end: currentStart + currentSegment.length,
      isTargetLanguage: isCurrentChinese,
    });
  }

  return segments;
}

/**
 * Segments text word by word (for non-Thai, non-Chinese languages)
 */
function segmentWordBased(text: string, language: SupportedLanguage): TextSegment[] {
  const segments: TextSegment[] = [];
  const words = text.split(/(\s+)/);
  let currentPos = 0;

  for (const word of words) {
    if (word.trim().length > 0 || word.match(/\s+/)) {
      segments.push({
        text: word,
        start: currentPos,
        end: currentPos + word.length,
        isTargetLanguage: true, // Assume target language for word-based
      });
    }
    currentPos += word.length;
  }

  return segments;
}

/**
 * Initialize Thai wordcut (to be implemented when wordcut is available)
 */
export async function initializeThaiWordcut(): Promise<void> {
  // TODO: Initialize wordcut when package is available
  // const wordcut = await import('wordcut');
  // wordcut.init(pathToDictionary);
}
