/**
 * POS (Part-of-Speech) chunking using Chrome LanguageModel API
 */

/// <reference types="dom-chromium-ai" />

import { ChromeAIManager } from '../chrome-ai/language-model-manager.js';
import type { POSChunk, POSChunkType, SupportedLanguage } from './types.js';

/**
 * Chunks text into POS groups using AI
 */
export async function chunkTextWithPOS(
  text: string,
  language: SupportedLanguage
): Promise<POSChunk[]> {
  console.log(`[TextAnnotate] chunkTextWithPOS: "${text.substring(0, 50)}..." (${language})`);
  const aiManager = ChromeAIManager.getInstance();
  
  try {
    // Initialize main session if needed
    console.log('[TextAnnotate] Getting AI session...');
    const session = await aiManager.getMainSession();
    const model = session.model;
    console.log('[TextAnnotate] AI session obtained');

    // Create prompt for POS chunking
    const prompt = createPOSChunkingPrompt(text, language);

    // Get AI response
    const response = await model.prompt(prompt, {});

    // Parse JSON response
    const chunks = parsePOSChunks(response);

    return chunks;
  } catch (error) {
    console.error('Failed to chunk text with POS:', error);
    
    // Check if it's a user gesture error
    if (error instanceof Error && error.message.includes('user gesture')) {
      console.warn('Chrome AI requires user gesture for POS chunking, using fallback');
    }
    
    // Fallback to word-based chunking
    return fallbackWordChunking(text, language);
  }
}

/**
 * Creates prompt for POS chunking
 */
function createPOSChunkingPrompt(text: string, language: SupportedLanguage): string {
  return `Analyze this ${language} text and identify parts of speech. Group words into meaningful chunks: noun phrases, verb phrases, adjective phrases, adverb phrases, prepositional phrases. For single words that don't form phrases, mark them as single_word.

Text: "${text}"

Return a JSON array with chunks. Each chunk should have:
- "text": the chunk text
- "type": one of "noun_phrase", "verb_phrase", "adjective_phrase", "adverb_phrase", "prepositional_phrase", or "single_word"
- "start": character position where chunk starts in original text (0-indexed)
- "end": character position where chunk ends (exclusive)

Important: The start and end positions must exactly match the text in the original string. Ensure all chunks together cover the entire text without gaps or overlaps.

Return ONLY valid JSON, no other text.`;
}

/**
 * Parses POS chunks from AI response
 */
function parsePOSChunks(response: string): POSChunk[] {
  try {
    // Try to extract JSON from response (might have markdown code blocks)
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const chunks: POSChunk[] = JSON.parse(jsonStr);
    
    // Validate chunks structure
    if (!Array.isArray(chunks)) {
      throw new Error('Response is not an array');
    }

    return chunks.map(chunk => ({
      text: chunk.text || '',
      type: (chunk.type || 'single_word') as POSChunkType,
      start: Number(chunk.start) || 0,
      end: Number(chunk.end) || 0,
      language: chunk.language as SupportedLanguage | undefined,
    }));
  } catch (error) {
    console.error('Failed to parse POS chunks:', error);
    throw error;
  }
}

/**
 * Fallback word-based chunking when AI fails
 */
function fallbackWordChunking(text: string, language: SupportedLanguage): POSChunk[] {
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
}
