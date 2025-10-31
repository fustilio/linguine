/**
 * Main text annotator class
 * Coordinates segmentation, POS chunking, and translation
 */

import { detectLanguageFromText, normalizeLanguageCode, detectLanguageFromTextFallback } from './language-detector.js';
import { chunkTextWithPOS } from './pos-chunker.js';
import { segmentText } from './segmenter.js';
import { extractPlainText } from './text-extractor.js';
import { translateChunk, rewriteChunk, getAndResetTranslatorMetrics } from './translator.js';
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
    phase?: 'extract' | 'detect' | 'segment' | 'prechunk' | 'translate' | 'simplify' | 'finalize',
    metrics?: {
      posTimeMs?: number;
      batchTimeMs?: number;
      literalCount?: number;
      contextualCount?: number;
      literalTimeMs?: number;
      contextualTimeMs?: number;
      phaseTimes?: Partial<Record<'extract' | 'detect' | 'segment' | 'prechunk' | 'translate' | 'finalize', number>>;
      totalMs?: number,
    }
  ) => void,
  signal?: AbortSignal,
): Promise<AnnotationResult> => {
  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw new Error('annotation_aborted');
    }
  };
  const ENABLE_TEXT_ANNOTATE_LOGS = false;
  const taLog = (...args: unknown[]) => {
    if (ENABLE_TEXT_ANNOTATE_LOGS) console.log(...args);
  };
  const totalStartTime = performance.now();
  taLog('[TextAnnotate] annotateText started');

  const plainText = extractPlainText(extractedText.content);
  const textLength = plainText.length;
  throwIfAborted();
  taLog('[TextAnnotate] Plain text length:', textLength);

  // Phase: extract
  const extractEnd = performance.now();
  onProgress?.([], false, undefined, 'extract', {
    phaseTimes: { extract: extractEnd - totalStartTime },
  });

  // Detect source language
  const languageStartTime = performance.now();
  let detectedLanguage: SupportedLanguage;
  if (extractedText.language) {
    detectedLanguage = normalizeLanguageCode(extractedText.language);
  } else {
    const detected = await detectLanguageFromText(plainText);
    if (detected) {
      detectedLanguage = detected;
    } else {
      // Use character-based fallback before falling back to targetLanguage
      // Import the fallback function via dynamic analysis of text
      const fallbackResult = detectLanguageFromTextFallback(plainText);
      if (fallbackResult) {
        detectedLanguage = fallbackResult;
        console.warn(
          `[TextAnnotate] Language detection failed, using character-based fallback: ${fallbackResult}`,
        );
      } else {
        // Last resort: use targetLanguage but warn
        detectedLanguage = targetLanguage;
        console.warn(
          `[TextAnnotate] Language detection failed and fallback returned undefined, defaulting to targetLanguage: ${targetLanguage}`,
        );
      }
    }
  }
  throwIfAborted();
  const languageEndTime = performance.now();
  taLog(
    `[TextAnnotate] Language detection completed in ${(languageEndTime - languageStartTime).toFixed(2)}ms:`,
    detectedLanguage,
  );
  
  // Check if we're in English simplification mode (source === target === English)
  const isSimplifyMode = detectedLanguage === 'en-US' && targetLanguage === 'en-US';
  if (isSimplifyMode) {
    console.log('[TextAnnotate] English simplification mode detected - using Rewriter API instead of Translator');
  }
  
  // Phase: detect
  onProgress?.([], false, undefined, 'detect', {
    phaseTimes: { detect: languageEndTime - languageStartTime },
  });

  // Segment text by language
  taLog('[TextAnnotate] Segmenting text...');
  const segmentStartTime = performance.now();
  const segments = segmentText(plainText, detectedLanguage);
  throwIfAborted();
  const segmentEndTime = performance.now();
  taLog(
    `[TextAnnotate] Segmentation completed in ${(segmentEndTime - segmentStartTime).toFixed(2)}ms, segments:`,
    segments.length,
  );
  // Phase: segment
  onProgress?.([], false, undefined, 'segment', {
    phaseTimes: { segment: segmentEndTime - segmentStartTime },
  });

  // Process each segment with parallel translation batching
  const annotatedChunks: AnnotatedChunk[] = [];
  taLog('[TextAnnotate] Processing segments...');
  let totalOperations = 0;
  let totalTranslationTime = 0;
  let translateAccumMs = 0;
  const BATCH_SIZE = 6; // Tunable concurrency for demo speed

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

  // Precompute POS chunks for all target-language segments in parallel to know total upfront
  const prechunkStart = performance.now();
  const posPromises: Array<
    Promise<{
      segmentIndex: number;
      chunks: Array<{ text: string; start?: number; end?: number }>;
    }>
  > = [];
  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx];
    if (seg.isTargetLanguage && seg.text.trim().length > 0) {
      posPromises.push(
        (async () => {
          try {
            const pos = await chunkTextWithPOS(seg.text, detectedLanguage);
            const filtered = pos.filter(c => c.text && c.text.trim().length > 0);
            const withOffsets = computeOffsets(seg.text, filtered);
            return { segmentIndex: sIdx, chunks: withOffsets };
          } catch {
            return { segmentIndex: sIdx, chunks: [] };
          }
        })(),
      );
    } else {
      precomputedChunks.push({ segmentIndex: sIdx, chunks: [] });
    }
  }
  const posResults = await Promise.allSettled(posPromises);
  for (const res of posResults) {
    if (res.status === 'fulfilled') {
      precomputedChunks.push(res.value);
      totalExpectedChunks += res.value.chunks.length || 1;
    }
  }
  const prechunkEnd = performance.now();
  const prechunkTimeMs = prechunkEnd - prechunkStart;

  // Emit prechunk phase with locked total and timing
  onProgress?.([], false, totalExpectedChunks, 'prechunk', {
    posTimeMs: prechunkTimeMs,
    phaseTimes: { prechunk: prechunkTimeMs },
  });

  for (const segment of segments) {
    throwIfAborted();
    if (!segment.isTargetLanguage && segment.text.trim().length === 0) {
      // Skip empty non-target segments
      continue;
    }

    if (segment.isTargetLanguage) {
      // Process target language segment
      taLog('[TextAnnotate] Processing target language segment:', segment.text.substring(0, 50) + '...');
      try {
        // Use precomputed POS groups
        taLog('[TextAnnotate] Using precomputed POS groups...');
        const pre = precomputedChunks.find(p => p.segmentIndex === segments.indexOf(segment));
        const filteredPosChunks = pre ? pre.chunks : [];
        taLog('[TextAnnotate] POS chunks created:', filteredPosChunks.length);

        // Process chunks in parallel batches (translate or simplify based on mode)
        taLog(
          isSimplifyMode
            ? '[TextAnnotate] Simplifying chunks in parallel batches...'
            : '[TextAnnotate] Translating chunks in parallel batches...',
        );
        const segmentStartTime = performance.now();

        for (let batchStart = 0; batchStart < filteredPosChunks.length; batchStart += BATCH_SIZE) {
          throwIfAborted();
          const batchEnd = Math.min(batchStart + BATCH_SIZE, filteredPosChunks.length);
          const batchChunks = filteredPosChunks.slice(batchStart, batchEnd);
          const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(filteredPosChunks.length / BATCH_SIZE);

          taLog(`[TextAnnotate] Processing batch ${batchNumber}/${totalBatches} (${batchChunks.length} chunks)`);

          // Process batch in parallel
          const batchStartTime = performance.now();
          const batchResultsSettled = await Promise.allSettled(
            batchChunks.map(async (chunk, index) => {
              throwIfAborted();
              const chunkIndex = batchStart + index + 1;
              taLog(
                `[TextAnnotate] ${isSimplifyMode ? 'Simplifying' : 'Translating'} chunk ${chunkIndex}/${filteredPosChunks.length}:`,
                chunk.text,
              );

              const processStartTime = performance.now();
              const maybe = chunk as unknown as { start?: number; end?: number; text: string };
              const localStart = typeof maybe.start === 'number' ? maybe.start : 0;
              const localEnd = typeof maybe.end === 'number' ? maybe.end : localStart + chunk.text.length;
              const translation = isSimplifyMode
                ? await rewriteChunk(chunk.text, segment.text, localStart, localEnd) // Context with offsets for simplification
                : await translateChunk(chunk.text, detectedLanguage, targetLanguage, segment.text);
              const processEndTime = performance.now();
              const processTime = processEndTime - processStartTime;

              return {
                chunk,
                translation,
                translationTime: processTime,
              };
            }),
          );

          const batchEndTime = performance.now();
          const batchTime = batchEndTime - batchStartTime;
          totalTranslationTime += batchTime;
          totalOperations += batchChunks.length;
          translateAccumMs += batchTime;

          taLog(
            `[TextAnnotate] Batch ${batchNumber} completed in ${batchTime.toFixed(2)}ms (${batchChunks.length} chunks)`,
          );

          // Add batch results to annotated chunks with global indices
          const batchResults: Array<{
            chunk: { text: string; start?: number; end?: number };
            translation: AnnotatedChunk['translation'];
            translationTime: number;
          }> = [];
          for (const r of batchResultsSettled) {
            if (r.status === 'fulfilled') {
              batchResults.push(r.value);
            } else {
              // Skip rejected item; could log error
            }
          }

          batchResults.forEach((result, batchIdx) => {
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
            const tMetrics = getAndResetTranslatorMetrics();
            onProgress(
              [...annotatedChunks],
              false,
              totalExpectedChunks,
              isSimplifyMode ? 'simplify' : 'translate',
              {
                literalCount: tMetrics.literalCount,
                contextualCount: tMetrics.contextualCount,
                literalTimeMs: tMetrics.literalTimeMs,
                contextualTimeMs: tMetrics.contextualTimeMs,
                batchTimeMs: batchTime,
                phaseTimes: { translate: translateAccumMs },
              },
            );
          }
        }

        const segmentEndTime = performance.now();
        taLog(`[TextAnnotate] Segment completed in ${(segmentEndTime - segmentStartTime).toFixed(2)}ms`);
      } catch (error) {
        console.error('[TextAnnotate] Failed to process segment:', error);
        // Fallback: treat as single chunk
        taLog('[TextAnnotate] Using fallback for segment');
        const fallbackStartTime = performance.now();
        const translation = isSimplifyMode
          ? await rewriteChunk(segment.text, segment.text, 0, segment.text.length)
          : await translateChunk(segment.text, detectedLanguage, targetLanguage, segment.text);
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

  taLog('[TextAnnotate] === TIMING METRICS ===');
  taLog(`[TextAnnotate] Total time: ${totalTime.toFixed(2)}ms`);
  taLog(`[TextAnnotate] Text length: ${textLength} characters`);
  taLog(`[TextAnnotate] Time per character: ${avgTimePerWord.toFixed(4)}ms`);
  taLog(`[TextAnnotate] Total operations: ${totalOperations}`);
  taLog(`[TextAnnotate] Batches processed: ${batchesProcessed}`);
  taLog(`[TextAnnotate] Max concurrent operations: ${BATCH_SIZE}`);
  taLog(`[TextAnnotate] Total translation time: ${totalTranslationTime.toFixed(2)}ms`);
  taLog(`[TextAnnotate] Average time per operation: ${avgTimePerOperation.toFixed(2)}ms`);
  taLog(`[TextAnnotate] Estimated sequential time: ${estimatedSequentialTime.toFixed(2)}ms`);
  taLog(`[TextAnnotate] Parallel speedup factor: ${speedupFactor.toFixed(2)}x`);
  taLog(`[TextAnnotate] Chunks created: ${annotatedChunks.length}`);
  taLog(`[TextAnnotate] ========================`);

  // Send final progress update
  if (onProgress) {
    onProgress(annotatedChunks, true, totalExpectedChunks, 'finalize', {
      phaseTimes: { finalize: totalEndTime - totalStartTime },
      totalMs: totalEndTime - totalStartTime,
    });
  }

  return {
    text: plainText,
    chunks: annotatedChunks,
    detectedLanguage,
    isSimplifyMode,
  };
};
