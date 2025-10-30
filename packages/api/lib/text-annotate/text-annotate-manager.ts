/**
 * Text Annotate Manager
 * Main coordinator class for text annotation functionality
 */

import { annotateText } from './annotator.js';
import { cleanupLanguageDetector, detectLanguageFromText } from './language-detector.js';
import { ReadingModeUI } from './reading-mode-ui.js';
import {
  extractContentWithReadability,
  extractSelectedText,
  extractTextBySelector,
  extractPlainText,
} from './text-extractor.js';
import { generateTitleForContent } from './title-generator.js';
import type { ExtractedText, AnnotationResult, SupportedLanguage } from './types.js';

export class TextAnnotateManager {
  private static instance: TextAnnotateManager | null = null;
  private readingModeUI: ReadingModeUI | null = null;
  private readonly ENABLE_TEXT_ANNOTATE_LOGS = false;
  private taLog(...args: unknown[]): void {
    if (this.ENABLE_TEXT_ANNOTATE_LOGS) console.log(...args);
  }

  /**
   * Resolve user's native language from storage; fallback to en-US
   */
  private async getNativeLanguageOrDefault(): Promise<SupportedLanguage> {
    try {
      // Lazy import to avoid hard dependency if storage package pathing differs in some builds
      const mod = await import('@extension/storage');
      if (mod?.languageStorage?.get) {
        const state = await mod.languageStorage.get();
        const lang = (state?.nativeLanguage || 'en-US') as SupportedLanguage;
        return lang;
      }
    } catch {
      // ignore
    }
    return 'en-US';
  }

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): TextAnnotateManager {
    if (!TextAnnotateManager.instance) {
      TextAnnotateManager.instance = new TextAnnotateManager();
    }
    return TextAnnotateManager.instance;
  }

  /**
   * Open reading mode with auto-extracted content
   */
  public async openReadingModeAuto(document: Document, url: string, useFullContent: boolean = true): Promise<void> {
    const startTime = performance.now();
    this.taLog('[TextAnnotate] Starting openReadingModeAuto with URL:', url, 'useFullContent:', useFullContent);

    // Extract content
    this.taLog('[TextAnnotate] Extracting content with Readability...');
    const extracted = extractContentWithReadability(document, url);
    this.taLog('[TextAnnotate] Content extracted:', extracted ? 'Success' : 'Failed');

    if (!extracted) {
      throw new Error('Failed to extract content from page');
    }

    this.taLog('[TextAnnotate] Extracted content preview:', {
      title: extracted.title,
      contentLength: extracted.content?.length || 0,
      language: extracted.language,
    });

    // For demo purposes, use a short Thai text sample if not using full content
    if (!useFullContent && extracted.content && extracted.content.length > 200) {
      this.taLog('[TextAnnotate] Using demo Thai text sample for testing');
      extracted.content = 'สวัสดีครับ คุณสบายดีไหม วันนี้อากาศดีมาก';
      extracted.title = 'Demo Thai Text';
    }

    // Initialize reading mode UI first
    if (!this.readingModeUI) {
      this.readingModeUI = new ReadingModeUI();
      this.readingModeUI.initialize();
    }

    // Show loading state
    this.readingModeUI.displayAnnotation(
      extracted.title,
      [
        {
          text: 'Loading...',
          type: 'single_word',
          start: 0,
          end: 7,
          translation: {
            literal: 'Loading...',
            contextual: 'Loading...',
            differs: false,
          },
        },
      ],
      () => this.readingModeUI?.hide(),
    );
    this.readingModeUI.show();

    // Pre-warm models (non-blocking)
    try {
      const aiManager = (await import('../chrome-ai/language-model-manager.js')).ChromeAIManager.getInstance();
      aiManager.initializeMainSession().catch(() => {});
      // Kick Translator via convenience function once; it will cache internally
      (async () => {
        try {
          const { translateText } = await import('../chrome-ai/convenience-functions.js');
          await translateText('ping', 'th-TH', 'en-US');
        } catch (err) {
          console.debug('[TextAnnotate] Translator warmup failed (non-fatal):', err);
        }
      })();
    } catch (err) {
      console.debug('[TextAnnotate] AI pre-warm skipped/failed (non-fatal):', err);
    }

    // Process in background
    this.taLog('[TextAnnotate] Starting background processing...');
    try {
      const nativeLang = await this.getNativeLanguageOrDefault();
      await this.processAndDisplay(extracted, nativeLang);
      const endTime = performance.now();
      this.taLog(
        `[TextAnnotate] Background processing completed successfully in ${(endTime - startTime).toFixed(2)}ms`,
      );
    } catch (error) {
      const endTime = performance.now();
      console.error(`[TextAnnotate] Failed to process text after ${(endTime - startTime).toFixed(2)}ms:`, error);
      // Show error state
      this.readingModeUI.displayAnnotation(
        extracted.title,
        [
          {
            text: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error'),
            type: 'single_word',
            start: 0,
            end: 50,
            translation: {
              literal: 'Error occurred',
              contextual: 'Error occurred',
              differs: false,
            },
          },
        ],
        () => this.readingModeUI?.hide(),
      );
    }
  }

  /**
   * Open reading mode with selected text
   */
  public async openReadingModeManual(document: Document): Promise<void> {
    const extracted = extractSelectedText(document);

    if (!extracted) {
      throw new Error('No text selected');
    }

    // Generate a title for selection if one is not available
    if (!extracted.title || extracted.title.trim().length === 0) {
      try {
        // Detect source language first so Writer can set expected languages
        const plain = extractPlainText(extracted.content);
        const detected = await detectLanguageFromText(plain);
        if (detected && !extracted.language) {
          extracted.language = detected;
        }
        const title = await generateTitleForContent(extracted.content, detected);
        if (title) {
          extracted.title = title;
        }
      } catch (e) {
        console.debug('[TextAnnotate] Title generation failed (non-fatal):', e);
      }
    }
    // Ensure reading mode UI is initialized for manual mode
    if (!this.readingModeUI) {
      this.readingModeUI = new ReadingModeUI();
      this.readingModeUI.initialize();
      this.readingModeUI.show();
    }
    const nativeLang = await this.getNativeLanguageOrDefault();
    await this.processAndDisplay(extracted, nativeLang);
  }

  /**
   * Open reading mode with selector-based extraction
   */
  public async openReadingModeSelector(document: Document, selector: string): Promise<void> {
    const extracted = extractTextBySelector(document, selector);

    if (!extracted) {
      throw new Error(`No element found for selector: ${selector}`);
    }
    // Ensure reading mode UI is initialized for selector mode
    if (!this.readingModeUI) {
      this.readingModeUI = new ReadingModeUI();
      this.readingModeUI.initialize();
      this.readingModeUI.show();
    }
    const nativeLang = await this.getNativeLanguageOrDefault();
    await this.processAndDisplay(extracted, nativeLang);
  }
  /**
   * Process extracted text and display in reading mode (with AI)
   */
  private async processAndDisplay(extracted: ExtractedText, targetLanguage: SupportedLanguage): Promise<void> {
    const processStartTime = performance.now();
    console.log('[TextAnnotate] processAndDisplay started with targetLanguage:', targetLanguage);
    try {
      // Defensive: ensure UI exists (manual/selector callers should set it up, but be safe)
      if (!this.readingModeUI) {
        this.readingModeUI = new ReadingModeUI();
        this.readingModeUI.initialize();
        this.readingModeUI.show();
      }
      // Try AI annotation first, fallback to simple if it fails
      let result: AnnotationResult;
      try {
        console.log('[TextAnnotate] Attempting AI annotation with progressive updates...');
        const aiStartTime = performance.now();

        // Display plain text first
        const plainText = extractPlainText(extracted.content);
        this.readingModeUI!.displayPlainTextWithProgress(
          extracted.title,
          plainText,
          0, // Will be updated when we know the total
          () => this.readingModeUI?.hide(),
        );

        // Use progressive annotation with streaming updates
        result = await annotateText(
          extracted,
          targetLanguage,
          (
            chunks,
            isComplete,
            totalChunks,
            phase,
            metrics?: {
              literalCount?: number;
              contextualCount?: number;
              literalTimeMs?: number;
              contextualTimeMs?: number;
              batchTimeMs?: number;
            },
          ) => {
            console.log(
              `[TextAnnotate] Progressive update: ${chunks.length} chunks, complete: ${isComplete}, total: ${totalChunks}, phase: ${phase}`,
            );

            // Update the reading mode UI with current chunks
            this.readingModeUI!.addAnnotations(chunks, isComplete, phase, metrics);

            // Update total chunks if provided
            if (totalChunks && this.readingModeUI) {
              this.readingModeUI.setTotalChunks(totalChunks);
            }
          },
        );

        const aiEndTime = performance.now();
        console.log(
          `[TextAnnotate] AI annotation successful in ${(aiEndTime - aiStartTime).toFixed(2)}ms, chunks:`,
          result.chunks.length,
        );
      } catch (aiError) {
        console.error('[TextAnnotate] AI annotation failed:', aiError);
        throw aiError;
      }

      // Progressive path already rendered in-place; do not re-render final annotation
      const processEndTime = performance.now();
      console.log(
        `[TextAnnotate] Reading mode display completed in ${(processEndTime - processStartTime).toFixed(2)}ms total`,
      );
    } catch (error) {
      const processEndTime = performance.now();
      console.error(
        `[TextAnnotate] Failed to annotate text after ${(processEndTime - processStartTime).toFixed(2)}ms:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Close reading mode
   */
  public closeReadingMode(): void {
    if (this.readingModeUI) {
      this.readingModeUI.hide();
    }
  }

  /**
   * Destroy manager and cleanup
   */
  public destroy(): void {
    if (this.readingModeUI) {
      this.readingModeUI.destroy();
      this.readingModeUI = null;
    }
    cleanupLanguageDetector();
  }
}
