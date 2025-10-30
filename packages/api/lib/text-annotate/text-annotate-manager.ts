/**
 * Text Annotate Manager
 * Main coordinator class for text annotation functionality
 */

import { annotateText } from './annotator.js';
import { cleanupLanguageDetector } from './language-detector.js';
import { ReadingModeUI } from './reading-mode-ui.js';
import { simpleAnnotateText } from './simple-annotator.js';
import {
  extractContentWithReadability,
  extractSelectedText,
  extractTextBySelector,
  extractPlainText,
} from './text-extractor.js';
import type { ExtractedText, AnnotationResult, SupportedLanguage } from './types.js';

export class TextAnnotateManager {
  private static instance: TextAnnotateManager | null = null;
  private readingModeUI: ReadingModeUI | null = null;

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
  public async openReadingModeAuto(
    document: Document,
    url: string,
    targetLanguage: SupportedLanguage = 'en-US',
    useFullContent: boolean = true,
  ): Promise<void> {
    const startTime = performance.now();
    console.log('[TextAnnotate] Starting openReadingModeAuto with URL:', url, 'useFullContent:', useFullContent);

    // Extract content
    console.log('[TextAnnotate] Extracting content with Readability...');
    const extracted = extractContentWithReadability(document, url);
    console.log('[TextAnnotate] Content extracted:', extracted ? 'Success' : 'Failed');

    if (!extracted) {
      throw new Error('Failed to extract content from page');
    }

    console.log('[TextAnnotate] Extracted content preview:', {
      title: extracted.title,
      contentLength: extracted.content?.length || 0,
      language: extracted.language,
    });

    // For demo purposes, use a short Thai text sample if not using full content
    if (!useFullContent && extracted.content && extracted.content.length > 200) {
      console.log('[TextAnnotate] Using demo Thai text sample for testing');
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
          await translateText('ping', 'th-TH' as any, 'en-US' as any);
        } catch {}
      })();
    } catch {}

    // Process in background
    console.log('[TextAnnotate] Starting background processing...');
    try {
      await this.processAndDisplay(extracted, targetLanguage);
      const endTime = performance.now();
      console.log(
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
  public async openReadingModeManual(document: Document, targetLanguage: SupportedLanguage = 'en-US'): Promise<void> {
    const extracted = extractSelectedText(document);

    if (!extracted) {
      throw new Error('No text selected');
    }

    await this.processAndDisplay(extracted, targetLanguage);
  }

  /**
   * Open reading mode with selector-based extraction
   */
  public async openReadingModeSelector(
    document: Document,
    selector: string,
    targetLanguage: SupportedLanguage = 'en-US',
  ): Promise<void> {
    const extracted = extractTextBySelector(document, selector);

    if (!extracted) {
      throw new Error(`No element found for selector: ${selector}`);
    }

    await this.processAndDisplay(extracted, targetLanguage);
  }

  /**
   * Process extracted text and display in reading mode (simple version)
   */
  private async processAndDisplaySimple(extracted: ExtractedText, targetLanguage: SupportedLanguage): Promise<void> {
    try {
      // Use simple annotator for testing
      const result: AnnotationResult = await simpleAnnotateText(extracted, targetLanguage);

      // Display in reading mode
      this.readingModeUI!.displayAnnotation(extracted.title, result.chunks, () => {
        // onClose callback
        this.readingModeUI?.hide();
      });
    } catch (error) {
      console.error('Failed to annotate text:', error);
      throw error;
    }
  }

  /**
   * Process extracted text and display in reading mode (with AI)
   */
  private async processAndDisplay(extracted: ExtractedText, targetLanguage: SupportedLanguage): Promise<void> {
    const processStartTime = performance.now();
    console.log('[TextAnnotate] processAndDisplay started with targetLanguage:', targetLanguage);
    try {
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
          (chunks, isComplete, totalChunks, phase, metrics?: {
            literalCount?: number;
            contextualCount?: number;
            literalTimeMs?: number;
            contextualTimeMs?: number;
            batchTimeMs?: number;
          }) => {
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
        console.warn('[TextAnnotate] AI annotation failed, falling back to simple annotation:', aiError);
        console.log('[TextAnnotate] Attempting simple annotation...');
        const simpleStartTime = performance.now();
        result = await simpleAnnotateText(extracted, targetLanguage, (chunks, isComplete) => {
          console.log(`[TextAnnotate] Simple progressive update: ${chunks.length} chunks, complete: ${isComplete}`);

          // Update the reading mode UI with current chunks
          this.readingModeUI!.displayAnnotation(extracted.title, chunks, () => {
            this.readingModeUI?.hide();
          });
        });
        const simpleEndTime = performance.now();
        console.log(
          `[TextAnnotate] Simple annotation completed in ${(simpleEndTime - simpleStartTime).toFixed(2)}ms, chunks:`,
          result.chunks.length,
        );
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
