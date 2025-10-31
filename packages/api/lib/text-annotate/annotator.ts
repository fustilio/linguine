/**
 * Main text annotator class
 * Coordinates segmentation, POS chunking, and translation
 */

import { detectLanguageFromText, normalizeLanguageCode, detectLanguageFromTextFallback } from './language-detector.js';
import { chunkTextWithPOS } from './pos-chunker.js';
import { segmentText } from './segmenter.js';
import { extractPlainText } from './text-extractor.js';
import {
  translateChunkLiteral,
  translateChunkContextual,
  rewriteChunk,
  getAndResetTranslatorMetrics,
} from './translator.js';
import type { AnnotatedChunk, AnnotationResult, ChunkTranslation, ExtractedText, SupportedLanguage } from './types.js';

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
    phase?:
      | 'extract'
      | 'detect'
      | 'segment'
      | 'prechunk'
      | 'translate'
      | 'translate-literal'
      | 'translate-contextual'
      | 'simplify'
      | 'finalize',
    metrics?: {
      posTimeMs?: number;
      batchTimeMs?: number;
      literalCount?: number;
      contextualCount?: number;
      literalTimeMs?: number;
      contextualTimeMs?: number;
      literalCompleted?: number;
      contextualCompleted?: number;
      phaseTimes?: Partial<
        Record<
          | 'extract'
          | 'detect'
          | 'segment'
          | 'prechunk'
          | 'translate'
          | 'translate-literal'
          | 'translate-contextual'
          | 'simplify'
          | 'finalize',
          number
        >
      >;
      totalMs?: number;
    },
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

  // Log extracted text details for debugging
  console.log('[TextAnnotate] Extracted text details:', {
    title: extractedText.title || '(no title)',
    language: extractedText.language || '(no language from extraction)',
    contentLength: extractedText.content?.length || 0,
    plainTextLength: textLength,
    plainTextPreview: plainText.substring(0, 200) + (plainText.length > 200 ? '...' : ''),
    contentHtmlPreview:
      extractedText.content?.substring(0, 200) +
      (extractedText.content && extractedText.content.length > 200 ? '...' : ''),
  });

  // Phase: extract
  const extractEnd = performance.now();
  onProgress?.([], false, undefined, 'extract', {
    phaseTimes: { extract: extractEnd - totalStartTime },
  });

  // Detect source language
  const languageStartTime = performance.now();
  let detectedLanguage: SupportedLanguage;
  let detectionMethod = 'unknown';

  // Priority 1: Try Chrome LanguageDetector API (most accurate - analyzes actual text content)
  const detected = await detectLanguageFromText(plainText);
  if (detected) {
    detectedLanguage = detected;
    detectionMethod = 'Chrome LanguageDetector API';
    console.log(`[TextAnnotate] Language detected via Chrome API: ${detected}`);
  } else {
    // Priority 2: Use character-based fallback (analyzes character patterns in text)
    const fallbackResult = detectLanguageFromTextFallback(plainText);
    if (fallbackResult) {
      detectedLanguage = fallbackResult;
      detectionMethod = 'character-based fallback';
      console.warn(`[TextAnnotate] Chrome API failed, using character-based fallback: ${fallbackResult}`);
    } else {
      // Priority 3: Use Readability's language hint (may be wrong - based on HTML metadata, not content)
      if (extractedText.language) {
        detectedLanguage = normalizeLanguageCode(extractedText.language);
        detectionMethod = 'extractedText.language (Readability hint - unreliable)';
        console.warn(
          `[TextAnnotate] Language detection failed, using Readability hint: ${extractedText.language} -> normalized to ${detectedLanguage}. WARNING: This is based on HTML metadata, not actual text content!`,
        );
      } else {
        // Last resort: use targetLanguage but warn
        detectedLanguage = targetLanguage;
        detectionMethod = 'targetLanguage fallback (last resort)';
        console.warn(
          `[TextAnnotate] All language detection methods failed, defaulting to targetLanguage: ${targetLanguage}`,
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
    console.log(`[TextAnnotate] English simplification mode detected - using Rewriter API instead of Translator`);
    console.log(
      `[TextAnnotate] Simplify mode reason: detectedLanguage=${detectedLanguage}, targetLanguage=${targetLanguage}, detectionMethod=${detectionMethod}`,
    );
    console.log(`[TextAnnotate] Text preview (first 100 chars): "${plainText.substring(0, 100)}..."`);
  } else {
    console.log(
      `[TextAnnotate] Translation mode: detectedLanguage=${detectedLanguage}, targetLanguage=${targetLanguage}, detectionMethod=${detectionMethod}`,
    );
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

        const segmentStartTime = performance.now();

        if (isSimplifyMode) {
          // Simplification mode: single phase (already efficient)
          taLog('[TextAnnotate] Simplifying chunks in parallel batches...');

          for (let batchStart = 0; batchStart < filteredPosChunks.length; batchStart += BATCH_SIZE) {
            throwIfAborted();
            const batchEnd = Math.min(batchStart + BATCH_SIZE, filteredPosChunks.length);
            const batchChunks = filteredPosChunks.slice(batchStart, batchEnd);
            const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(filteredPosChunks.length / BATCH_SIZE);

            taLog(`[TextAnnotate] Processing batch ${batchNumber}/${totalBatches} (${batchChunks.length} chunks)`);

            const batchStartTime = performance.now();
            const batchResultsSettled = await Promise.allSettled(
              batchChunks.map(async chunk => {
                throwIfAborted();
                const maybe = chunk as unknown as { start?: number; end?: number; text: string };
                const localStart = typeof maybe.start === 'number' ? maybe.start : 0;
                const localEnd = typeof maybe.end === 'number' ? maybe.end : localStart + chunk.text.length;
                const translation = await rewriteChunk(chunk.text, segment.text, localStart, localEnd);
                return { chunk, translation };
              }),
            );

            const batchEndTime = performance.now();
            const batchTime = batchEndTime - batchStartTime;
            totalTranslationTime += batchTime;
            totalOperations += batchChunks.length;
            translateAccumMs += batchTime;

            // Add batch results to annotated chunks
            for (const r of batchResultsSettled) {
              if (r.status === 'fulfilled') {
                const { chunk, translation } = r.value;
                if (!chunk.text || chunk.text.trim().length === 0) continue;

                const maybe = chunk as unknown as { start?: number; end?: number; text: string };
                const localStart = typeof maybe.start === 'number' ? maybe.start : 0;
                const localEnd = typeof maybe.end === 'number' ? maybe.end : localStart + chunk.text.length;
                const globalStart = (segment.start ?? 0) + localStart;
                const globalEnd = (segment.start ?? 0) + localEnd;

                annotatedChunks.push({
                  ...chunk,
                  start: globalStart,
                  end: globalEnd,
                  type: (chunk as unknown as { type?: AnnotatedChunk['type'] }).type || 'single_word',
                  language: detectedLanguage,
                  translation,
                });
              }
            }

            // Send progressive update after each batch
            if (onProgress) {
              const tMetrics = getAndResetTranslatorMetrics();
              onProgress([...annotatedChunks], false, totalExpectedChunks, 'simplify', {
                literalCount: tMetrics.literalCount,
                contextualCount: tMetrics.contextualCount,
                literalTimeMs: tMetrics.literalTimeMs,
                contextualTimeMs: tMetrics.contextualTimeMs,
                batchTimeMs: batchTime,
                phaseTimes: { simplify: translateAccumMs },
              });
            }
          }
        } else {
          // Translation mode: two phases (literal first, then contextual)

          // PHASE 1: Literal translations (fast, stream to UI immediately)
          taLog('[TextAnnotate] Phase 1: Translating chunks literally in parallel batches...');
          const literalPhaseStart = performance.now();
          let literalCompletedCount = 0;

          // Store literal results indexed by chunk text/position for phase 2
          const literalResults = new Map<
            string,
            { chunk: { text: string; start?: number; end?: number }; literal: string }
          >();

          for (let batchStart = 0; batchStart < filteredPosChunks.length; batchStart += BATCH_SIZE) {
            throwIfAborted();
            const batchEnd = Math.min(batchStart + BATCH_SIZE, filteredPosChunks.length);
            const batchChunks = filteredPosChunks.slice(batchStart, batchEnd);
            const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(filteredPosChunks.length / BATCH_SIZE);

            taLog(`[TextAnnotate] Literal batch ${batchNumber}/${totalBatches} (${batchChunks.length} chunks)`);

            const batchStartTime = performance.now();
            const batchResultsSettled = await Promise.allSettled(
              batchChunks.map(async chunk => {
                throwIfAborted();
                const literalResult = await translateChunkLiteral(chunk.text, detectedLanguage, targetLanguage);
                return { chunk, literalResult };
              }),
            );

            const batchEndTime = performance.now();
            const batchTime = batchEndTime - batchStartTime;
            totalTranslationTime += batchTime;
            totalOperations += batchChunks.length;
            translateAccumMs += batchTime;

            // Add literal results to annotated chunks and store for phase 2
            for (const r of batchResultsSettled) {
              if (r.status === 'fulfilled') {
                const { chunk, literalResult } = r.value;
                if (!chunk.text || chunk.text.trim().length === 0) continue;

                const maybe = chunk as unknown as { start?: number; end?: number; text: string };
                const localStart = typeof maybe.start === 'number' ? maybe.start : 0;
                const localEnd = typeof maybe.end === 'number' ? maybe.end : localStart + chunk.text.length;
                const globalStart = (segment.start ?? 0) + localStart;
                const globalEnd = (segment.start ?? 0) + localEnd;

                // Create chunk key for lookup in phase 2
                const chunkKey = `${globalStart}-${globalEnd}-${chunk.text}`;
                literalResults.set(chunkKey, { chunk, literal: literalResult.literal });

                // Add to annotated chunks with literal-only translation
                annotatedChunks.push({
                  ...chunk,
                  start: globalStart,
                  end: globalEnd,
                  type: (chunk as unknown as { type?: AnnotatedChunk['type'] }).type || 'single_word',
                  language: detectedLanguage,
                  translation: literalResult, // Initially has literal only
                });
                literalCompletedCount++;
              }
            }

            // Send progressive update after each literal batch (stream to UI immediately)
            if (onProgress) {
              const tMetrics = getAndResetTranslatorMetrics();
              onProgress([...annotatedChunks], false, totalExpectedChunks, 'translate-literal', {
                literalCount: tMetrics.literalCount,
                contextualCount: 0,
                literalTimeMs: tMetrics.literalTimeMs,
                contextualTimeMs: 0,
                batchTimeMs: batchTime,
                phaseTimes: { 'translate-literal': translateAccumMs },
                literalCompleted: literalCompletedCount,
                contextualCompleted: 0,
              });
            }
          }

          const literalPhaseEnd = performance.now();
          taLog(
            `[TextAnnotate] Literal phase completed in ${(literalPhaseEnd - literalPhaseStart).toFixed(2)}ms, starting contextual phase...`,
          );

          // PHASE 2: Contextual translations (slower, uses literal results as input)
          taLog('[TextAnnotate] Phase 2: Translating chunks contextually in parallel batches...');
          const contextualPhaseStart = performance.now();
          let contextualAccumMs = 0;
          let contextualCompletedCount = 0;

          // Process all chunks again for contextual translation
          for (let batchStart = 0; batchStart < filteredPosChunks.length; batchStart += BATCH_SIZE) {
            throwIfAborted();
            const batchEnd = Math.min(batchStart + BATCH_SIZE, filteredPosChunks.length);
            const batchChunks = filteredPosChunks.slice(batchStart, batchEnd);
            const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(filteredPosChunks.length / BATCH_SIZE);

            taLog(`[TextAnnotate] Contextual batch ${batchNumber}/${totalBatches} (${batchChunks.length} chunks)`);

            const batchStartTime = performance.now();
            const batchResultsSettled = await Promise.allSettled(
              batchChunks.map(async chunk => {
                throwIfAborted();
                const maybe = chunk as unknown as { start?: number; end?: number; text: string };
                const localStart = typeof maybe.start === 'number' ? maybe.start : 0;
                const localEnd = typeof maybe.end === 'number' ? maybe.end : localStart + chunk.text.length;
                const globalStart = (segment.start ?? 0) + localStart;
                const globalEnd = (segment.start ?? 0) + localEnd;
                const chunkKey = `${globalStart}-${globalEnd}-${chunk.text}`;

                const literalData = literalResults.get(chunkKey);
                if (!literalData) {
                  // Fallback if literal not found
                  const literalResult = await translateChunkLiteral(chunk.text, detectedLanguage, targetLanguage);
                  const contextualResult = await translateChunkContextual(
                    chunk.text,
                    detectedLanguage,
                    targetLanguage,
                    segment.text,
                    literalResult.literal,
                  );
                  return { chunk, translation: contextualResult };
                }

                const contextualResult = await translateChunkContextual(
                  chunk.text,
                  detectedLanguage,
                  targetLanguage,
                  segment.text,
                  literalData.literal,
                );
                return { chunk, translation: contextualResult };
              }),
            );

            const batchEndTime = performance.now();
            const batchTime = batchEndTime - batchStartTime;
            totalTranslationTime += batchTime;
            contextualAccumMs += batchTime;

            // Update annotated chunks with contextual translations
            for (const r of batchResultsSettled) {
              if (r.status === 'fulfilled') {
                const { chunk, translation } = r.value;
                if (!chunk.text || chunk.text.trim().length === 0) continue;

                // Find the corresponding annotated chunk and update its translation
                const maybe = chunk as unknown as { start?: number; end?: number; text: string };
                const localStart = typeof maybe.start === 'number' ? maybe.start : 0;
                const localEnd = typeof maybe.end === 'number' ? maybe.end : localStart + chunk.text.length;
                const globalStart = (segment.start ?? 0) + localStart;
                const globalEnd = (segment.start ?? 0) + localEnd;

                // Find and update the existing chunk
                const existingChunk = annotatedChunks.find(
                  ac => ac.start === globalStart && ac.end === globalEnd && ac.text === chunk.text,
                );
                if (existingChunk) {
                  existingChunk.translation = translation;
                } else {
                  // Fallback: add new chunk if not found
                  annotatedChunks.push({
                    ...chunk,
                    start: globalStart,
                    end: globalEnd,
                    type: (chunk as unknown as { type?: AnnotatedChunk['type'] }).type || 'single_word',
                    language: detectedLanguage,
                    translation,
                  });
                }
                contextualCompletedCount++;
              }
            }

            // Send progressive update after each contextual batch
            if (onProgress) {
              const tMetrics = getAndResetTranslatorMetrics();
              onProgress([...annotatedChunks], false, totalExpectedChunks, 'translate-contextual', {
                literalCount: 0,
                contextualCount: tMetrics.contextualCount,
                literalTimeMs: 0,
                contextualTimeMs: tMetrics.contextualTimeMs,
                batchTimeMs: batchTime,
                phaseTimes: {
                  'translate-literal': literalPhaseEnd - literalPhaseStart,
                  'translate-contextual': contextualAccumMs,
                },
                literalCompleted: literalCompletedCount,
                contextualCompleted: contextualCompletedCount,
              });
            }
          }

          const contextualPhaseEnd = performance.now();
          taLog(
            `[TextAnnotate] Contextual phase completed in ${(contextualPhaseEnd - contextualPhaseStart).toFixed(2)}ms`,
          );
        }

        const segmentEndTime = performance.now();
        taLog(`[TextAnnotate] Segment completed in ${(segmentEndTime - segmentStartTime).toFixed(2)}ms`);
      } catch (error) {
        console.error('[TextAnnotate] Failed to process segment:', error);
        // Fallback: treat as single chunk
        taLog('[TextAnnotate] Using fallback for segment');
        const fallbackStartTime = performance.now();
        let translation: ChunkTranslation;

        if (isSimplifyMode) {
          translation = await rewriteChunk(segment.text, segment.text, 0, segment.text.length);
        } else {
          // For translation, do literal first, then contextual
          const literalResult = await translateChunkLiteral(segment.text, detectedLanguage, targetLanguage);
          translation = await translateChunkContextual(
            segment.text,
            detectedLanguage,
            targetLanguage,
            segment.text,
            literalResult.literal,
          );
        }

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
