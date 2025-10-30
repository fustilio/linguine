/**
 * Main text annotator class
 * Coordinates segmentation, POS chunking, and translation
 */

import { detectLanguageFromText, normalizeLanguageCode } from './language-detector.js';
import { chunkTextWithPOS } from './pos-chunker.js';
import { segmentText } from './segmenter.js';
import { extractPlainText } from './text-extractor.js';
import { translateChunk } from './translator.js';
import type { AnnotatedChunk, AnnotationResult, ExtractedText, SupportedLanguage } from './types.js';

/**
 * Annotates extracted text with translations
 */
export const annotateText = async (
  extractedText: ExtractedText,
  targetLanguage: SupportedLanguage = 'en-US',
  onProgress?: (
    chunks: AnnotatedChunk[],
    isComplete: boolean,
    totalChunks?: number,
    phase?: 'extract' | 'detect' | 'segment' | 'prechunk' | 'translate' | 'finalize',
  ) => void,
): Promise<AnnotationResult> => {
  const totalStartTime = performance.now();
  console.log('[TextAnnotate] annotateText started');

  const plainText = extractPlainText(extractedText.content);
  const textLength = plainText.length;
  console.log('[TextAnnotate] Plain text length:', textLength);

  // Phase: extract
  onProgress?.([], false, undefined, 'extract');

  // Detect source language
  const languageStartTime = performance.now();
  const detectedLanguage = extractedText.language
    ? normalizeLanguageCode(extractedText.language)
    : (await detectLanguageFromText(plainText)) || targetLanguage;
  const languageEndTime = performance.now();
  console.log(
    `[TextAnnotate] Language detection completed in ${(languageEndTime - languageStartTime).toFixed(2)}ms:`,
    detectedLanguage,
  );
  // Phase: detect
  onProgress?.([], false, undefined, 'detect');

  // Segment text by language
  console.log('[TextAnnotate] Segmenting text...');
  const segmentStartTime = performance.now();
  const segments = segmentText(plainText, detectedLanguage);
  const segmentEndTime = performance.now();
  console.log(
    `[TextAnnotate] Segmentation completed in ${(segmentEndTime - segmentStartTime).toFixed(2)}ms, segments:`,
    segments.length,
  );
  // Phase: segment
  onProgress?.([], false, undefined, 'segment');

  // Process each segment with parallel translation batching
  const annotatedChunks: AnnotatedChunk[] = [];
  console.log('[TextAnnotate] Processing segments...');
  let totalOperations = 0;
  let totalTranslationTime = 0;
  const BATCH_SIZE = 3; // Process 3 chunks at a time for streaming effect

  // Total expected chunks and precomputed POS chunks per segment
  let totalExpectedChunks = 0;
  const precomputedChunks: Array<{
    segmentIndex: number;
    chunks: Array<{ text: string; start?: number; end?: number }>;
  }> = [];

  // Helper: compute sequential offsets for chunk texts within a segment
  const computeOffsets = (
    segmentText: string,
    chunks: Array<{ text: string; start?: number; end?: number }>,
  ): Array<{ text: string; start?: number; end?: number }> => {
    let cursor = 0;
    const withOffsets: Array<{ text: string; start?: number; end?: number }> = [];
    for (const c of chunks) {
      const target = c.text || '';
      if (target.length === 0) {
        withOffsets.push({ ...c });
        continue;
      }
      const idx = segmentText.indexOf(target, cursor);
      if (idx !== -1) {
        const start = idx;
        const end = idx + target.length;
        withOffsets.push({ ...c, start, end });
        cursor = end; // advance past this match to keep ordering
      } else {
        // Fallback: try exact match without moving cursor (rare)
        const alt = segmentText.indexOf(target);
        if (alt !== -1) {
          withOffsets.push({ ...c, start: alt, end: alt + target.length });
          cursor = alt + target.length;
        } else {
          // As a last resort, approximate by assigning at current cursor
          const approxStart = cursor;
          const approxEnd = Math.min(cursor + target.length, segmentText.length);
          withOffsets.push({ ...c, start: approxStart, end: approxEnd });
          cursor = approxEnd;
        }
      }
    }
    return withOffsets;
  };

  // Precompute POS chunks for all target-language segments to know total upfront
  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx];
    if (seg.isTargetLanguage && seg.text.trim().length > 0) {
      try {
        const pos = await chunkTextWithPOS(seg.text, detectedLanguage);
        const filtered = pos.filter(c => c.text && c.text.trim().length > 0);
        const withOffsets = computeOffsets(seg.text, filtered);
        precomputedChunks.push({ segmentIndex: sIdx, chunks: withOffsets });
        totalExpectedChunks += withOffsets.length;
      } catch {
        // If chunking fails, count as 1 fallback
        precomputedChunks.push({ segmentIndex: sIdx, chunks: [] });
        totalExpectedChunks += 1;
      }
    } else {
      precomputedChunks.push({ segmentIndex: sIdx, chunks: [] });
    }
  }

  // Emit prechunk phase with locked total
  onProgress?.([], false, totalExpectedChunks, 'prechunk');

  for (const segment of segments) {
    if (!segment.isTargetLanguage && segment.text.trim().length === 0) {
      // Skip empty non-target segments
      continue;
    }

    if (segment.isTargetLanguage) {
      // Process target language segment
      console.log('[TextAnnotate] Processing target language segment:', segment.text.substring(0, 50) + '...');
      try {
        // Use precomputed POS groups
        console.log('[TextAnnotate] Using precomputed POS groups...');
        const pre = precomputedChunks.find(p => p.segmentIndex === segments.indexOf(segment));
        const filteredPosChunks = pre ? pre.chunks : [];
        console.log('[TextAnnotate] POS chunks created:', filteredPosChunks.length);

        // Translate chunks in parallel batches
        console.log('[TextAnnotate] Translating chunks in parallel batches...');
        const segmentStartTime = performance.now();

        for (let batchStart = 0; batchStart < filteredPosChunks.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, filteredPosChunks.length);
          const batchChunks = filteredPosChunks.slice(batchStart, batchEnd);
          const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(filteredPosChunks.length / BATCH_SIZE);

          console.log(`[TextAnnotate] Processing batch ${batchNumber}/${totalBatches} (${batchChunks.length} chunks)`);

          // Process batch in parallel
          const batchStartTime = performance.now();
          const batchResults = await Promise.all(
            batchChunks.map(async (chunk, index) => {
              const chunkIndex = batchStart + index + 1;
              console.log(`[TextAnnotate] Translating chunk ${chunkIndex}/${filteredPosChunks.length}:`, chunk.text);

              const translationStartTime = performance.now();
              const translation = await translateChunk(
                chunk.text,
                detectedLanguage,
                targetLanguage,
                segment.text, // Context for contextual translation
              );
              const translationEndTime = performance.now();
              const translationTime = translationEndTime - translationStartTime;

              return {
                chunk,
                translation,
                translationTime,
              };
            }),
          );

          const batchEndTime = performance.now();
          const batchTime = batchEndTime - batchStartTime;
          totalTranslationTime += batchTime;
          totalOperations += batchChunks.length;

          console.log(
            `[TextAnnotate] Batch ${batchNumber} completed in ${batchTime.toFixed(2)}ms (${batchChunks.length} chunks)`,
          );

          // Add batch results to annotated chunks with global indices
          batchResults.forEach(result => {
            // Skip whitespace-only results
            if (!result.chunk.text || result.chunk.text.trim().length === 0) {
              return;
            }
            const maybe = result.chunk as unknown as { start?: number; end?: number; text: string };
            const localStart = typeof maybe.start === 'number' ? maybe.start : 0;
            const localEnd = typeof maybe.end === 'number' ? maybe.end : localStart + result.chunk.text.length;
            const globalStart = (segment.start ?? 0) + localStart;
            const globalEnd = (segment.start ?? 0) + localEnd;

            annotatedChunks.push({
              ...result.chunk,
              start: globalStart,
              end: globalEnd,
              type: (result.chunk as unknown as { type?: AnnotatedChunk['type'] }).type || 'single_word',
              language: detectedLanguage,
              translation: result.translation,
            });
          });

          // Send progressive update after each batch
          if (onProgress) {
            onProgress([...annotatedChunks], false, totalExpectedChunks, 'translate');
          }
        }

        const segmentEndTime = performance.now();
        console.log(`[TextAnnotate] Segment completed in ${(segmentEndTime - segmentStartTime).toFixed(2)}ms`);
      } catch (error) {
        console.error('[TextAnnotate] Failed to process segment:', error);
        // Fallback: treat as single chunk
        console.log('[TextAnnotate] Using fallback for segment');
        const fallbackStartTime = performance.now();
        const translation = await translateChunk(segment.text, detectedLanguage, targetLanguage, segment.text);
        const fallbackEndTime = performance.now();
        const fallbackTime = fallbackEndTime - fallbackStartTime;
        totalTranslationTime += fallbackTime;
        totalOperations++;

        annotatedChunks.push({
          text: segment.text,
          type: 'single_word',
          start: segment.start,
          end: segment.end,
          language: detectedLanguage,
          translation,
        });
      }
    } else {
      // Non-target language segments (e.g., English when annotating Thai)
      // Keep as-is without translation
      annotatedChunks.push({
        text: segment.text,
        type: 'single_word',
        start: segment.start,
        end: segment.end,
        translation: {
          literal: segment.text,
          contextual: segment.text,
          differs: false,
        },
      });
    }
  }

  const totalEndTime = performance.now();

  // Calculate comprehensive timing metrics
  const totalTime = totalEndTime - totalStartTime;
  const avgTimePerWord = textLength > 0 ? totalTime / textLength : 0;
  const avgTimePerOperation = totalOperations > 0 ? totalTranslationTime / totalOperations : 0;

  // Calculate parallel performance metrics
  const estimatedSequentialTime = avgTimePerOperation * totalOperations;
  const speedupFactor = totalOperations > 0 ? estimatedSequentialTime / totalTranslationTime : 1;
  const batchesProcessed = Math.ceil(totalOperations / BATCH_SIZE);

  console.log('[TextAnnotate] === TIMING METRICS ===');
  console.log(`[TextAnnotate] Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`[TextAnnotate] Text length: ${textLength} characters`);
  console.log(`[TextAnnotate] Time per character: ${avgTimePerWord.toFixed(4)}ms`);
  console.log(`[TextAnnotate] Total operations: ${totalOperations}`);
  console.log(`[TextAnnotate] Batches processed: ${batchesProcessed}`);
  console.log(`[TextAnnotate] Max concurrent operations: ${BATCH_SIZE}`);
  console.log(`[TextAnnotate] Total translation time: ${totalTranslationTime.toFixed(2)}ms`);
  console.log(`[TextAnnotate] Average time per operation: ${avgTimePerOperation.toFixed(2)}ms`);
  console.log(`[TextAnnotate] Estimated sequential time: ${estimatedSequentialTime.toFixed(2)}ms`);
  console.log(`[TextAnnotate] Parallel speedup factor: ${speedupFactor.toFixed(2)}x`);
  console.log(`[TextAnnotate] Chunks created: ${annotatedChunks.length}`);
  console.log(`[TextAnnotate] ========================`);

  // Send final progress update
  if (onProgress) {
    onProgress(annotatedChunks, true, totalExpectedChunks, 'finalize');
  }

  return {
    text: plainText,
    chunks: annotatedChunks,
    detectedLanguage,
  };
};
