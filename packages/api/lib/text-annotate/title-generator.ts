/**
 * Title generator for selected text
 * Tries Chrome AI Rewriter first, falls back to a heuristic
 */

import { extractPlainText } from './text-extractor.js';
import { rewriteText, writeWithWriter } from '../chrome-ai/convenience-functions.js';

/**
 * Generate a concise title for given HTML content or plain text.
 * - Prefers Chrome AI Rewriter via convenience function
 * - Falls back to a simple heuristic if AI is unavailable
 */
export async function generateTitleForContent(
  contentHtmlOrPlain: string,
  sourceLanguage?: string,
): Promise<string | undefined> {
  const plain = extractPlainText(contentHtmlOrPlain).trim();
  if (!plain) return undefined;

  // Prefer Writer API for title generation; destroy the writer after use
  try {
    const prompt =
      'Generate a concise, descriptive title (max 60 characters) for the provided text. Return ONLY the title without quotes or trailing punctuation.';
    const writerOut = await writeWithWriter(prompt, {
      context: plain,
      // Assign expected languages per guidance; prompt/output in English, context may vary
      expectedInputLanguages: ['en'],
      expectedContextLanguages: Array.from(
        new Set([
          'en',
          ...(sourceLanguage ? [sourceLanguage.split('-')[0]] : []),
          'th',
          'zh',
          'ja',
          'es',
        ]),
      ),
      outputLanguage: 'en',
      format: 'plain-text',
      length: 'short',
      tone: 'neutral',
    });
    const cleanedWriter = sanitizeTitle(writerOut);
    if (cleanedWriter) return cleanedWriter;
  } catch {
    // ignore, try rewriter next
  }

  // Try Chrome AI Rewriter to create a concise title
  try {
    const promptContext =
      'Generate a concise, descriptive title (max 60 characters) for the provided text. Return ONLY the title without quotes or punctuation at the end.';
    const result = await rewriteText(plain, { context: promptContext } as any);
    const candidate = (typeof result === 'string' ? result : String(result || '')).trim();
    const cleaned = sanitizeTitle(candidate);
    if (cleaned) return cleaned;
  } catch {
    // ignore and try fallback
  }

  // Fallback: take the first sentence or first ~10 words, capitalize
  return heuristicTitle(plain);
}

function sanitizeTitle(s: string): string {
  let t = s.replace(/^["'\-\s]+|[\s"']+$/g, '');
  // Remove trailing period-like punctuation
  t = t.replace(/[.!?\s]+$/g, '');
  // Collapse whitespace
  t = t.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  // Limit length
  if (t.length > 80) t = t.slice(0, 80).trim();
  // Basic capitalization for fallback outputs
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function heuristicTitle(plain: string): string {
  // Prefer first sentence
  const sentenceMatch = plain.match(/^[^.!?]{8,80}[.!?]/);
  if (sentenceMatch) {
    return sanitizeTitle(sentenceMatch[0]);
  }

  // Otherwise use first ~10 words
  const words = plain.split(/\s+/).filter(Boolean).slice(0, 12).join(' ');
  return sanitizeTitle(words);
}


