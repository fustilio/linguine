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
import type { AnnotatedChunk, ExtractedText, AnnotationResult, SupportedLanguage } from './types.js';

/**
 * Callback interface for React-based UI updates
 */
export interface ReadingModeUICallbacks {
  onShow?: (title: string | undefined, plainText: string, totalChunks: number) => void;
  onUpdate?: (
    chunks: AnnotatedChunk[],
    isComplete: boolean,
    totalChunks: number,
    phase?: string,
    metrics?: {
      literalCount?: number;
      contextualCount?: number;
      literalTimeMs?: number;
      contextualTimeMs?: number;
      batchTimeMs?: number;
    },
  ) => void;
  onHide?: () => void;
}

export class TextAnnotateManager {
  private static instance: TextAnnotateManager | null = null;
  private readingModeUI: ReadingModeUI | null = null;
  private uiCallbacks: ReadingModeUICallbacks | null = null;
  private currentAbortController: AbortController | null = null;

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
   * Set callbacks for React-based UI updates (alternative to ReadingModeUI)
   */
  public setUICallbacks(callbacks: ReadingModeUICallbacks | null): void {
    this.uiCallbacks = callbacks;
  }

  /**
   * Open reading mode with auto-extracted content
   */
  public async openReadingModeAuto(document: Document, url: string, useFullContent: boolean = true): Promise<void> {
    // Extract content
    const extracted = extractContentWithReadability(document, url);

    if (!extracted) {
      throw new Error('Failed to extract content from page');
    }

    // For demo purposes, use a short Thai text sample if not using full content
    if (!useFullContent && extracted.content && extracted.content.length > 200) {
      extracted.content = 'สวัสดีครับ คุณสบายดีไหม วันนี้อากาศดีมาก';
      extracted.title = 'Demo Thai Text';
    }

    // Initialize UI (either React callbacks or DOM-based UI)
    const plainText = extractPlainText(extracted.content);

    if (this.uiCallbacks) {
      // Use React UI callbacks
      this.uiCallbacks.onShow?.(extracted.title, plainText, 0);
    } else {
      // Use legacy DOM-based UI
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
        () => this.cancelCurrentWork(true),
      );
      this.readingModeUI.show();
    }

    // Pre-warm models (non-blocking)
    try {
      const aiManager = (await import('../chrome-ai/language-model-manager.js')).ChromeAIManager.getInstance();
      aiManager.initializeMainSession().catch(() => {});
      // Kick Translator via convenience function once; it will cache internally
      (async () => {
        try {
          const { translateText } = await import('../chrome-ai/convenience-functions.js');
          await translateText('ping', 'th-TH', 'en-US');
        } catch {
          // Ignore warmup errors
        }
      })();
    } catch {
      // Ignore pre-warm errors
    }

    // Process in background
    try {
      const nativeLang = await this.getNativeLanguageOrDefault();
      await this.processAndDisplay(extracted, nativeLang);
    } catch (error) {
      // Show error state
      if (this.uiCallbacks) {
        this.uiCallbacks.onHide?.();
      } else if (this.readingModeUI) {
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
    // Initialize UI
    const plainText = extractPlainText(extracted.content);
    if (this.uiCallbacks) {
      this.uiCallbacks.onShow?.(extracted.title, plainText, 0);
    } else {
      if (!this.readingModeUI) {
        this.readingModeUI = new ReadingModeUI();
        this.readingModeUI.initialize();
        this.readingModeUI.show();
      }
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
    // Initialize UI
    const plainText = extractPlainText(extracted.content);
    if (this.uiCallbacks) {
      this.uiCallbacks.onShow?.(extracted.title, plainText, 0);
    } else {
      if (!this.readingModeUI) {
        this.readingModeUI = new ReadingModeUI();
        this.readingModeUI.initialize();
        this.readingModeUI.show();
      }
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
      const plainText = extractPlainText(extracted.content);
      if (this.uiCallbacks) {
        // React UI: already shown via onShow callback
      } else {
        if (!this.readingModeUI) {
          this.readingModeUI = new ReadingModeUI();
          this.readingModeUI.initialize();
          this.readingModeUI.show();
        }
        // Display plain text first
        this.readingModeUI.displayPlainTextWithProgress(
          extracted.title,
          plainText,
          0, // Will be updated when we know the total
          () => this.cancelCurrentWork(true),
        );
      }

      // Try AI annotation first, fallback to simple if it fails
      let result: AnnotationResult;
      try {
        console.log('[TextAnnotate] Attempting AI annotation with progressive updates...');
        const aiStartTime = performance.now();

        // Use progressive annotation with streaming updates
        // Abort any previous run
        if (this.currentAbortController) {
          try {
            this.currentAbortController.abort();
          } catch {
            /* empty */
          }
        }
        this.currentAbortController = new AbortController();
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

            // Update UI with current chunks
            if (this.uiCallbacks) {
              console.log('[TextAnnotate] Calling onUpdate callback with:', {
                chunksCount: chunks.length,
                isComplete,
                totalChunks,
                phase,
              });
              this.uiCallbacks.onUpdate?.(chunks, isComplete, totalChunks || chunks.length, phase, metrics);
            } else if (this.readingModeUI) {
              this.readingModeUI.addAnnotations(chunks, isComplete, phase, metrics);
              // Update total chunks if provided
              if (totalChunks) {
                this.readingModeUI.setTotalChunks(totalChunks);
              }
            }
          },
          this.currentAbortController.signal,
        );

        const aiEndTime = performance.now();
        console.log(
          `[TextAnnotate] AI annotation successful in ${(aiEndTime - aiStartTime).toFixed(2)}ms, chunks:`,
          result.chunks.length,
        );
      } catch (aiError) {
        if (aiError instanceof Error && aiError.message === 'annotation_aborted') {
          console.log('[TextAnnotate] Annotation aborted by user');
          return; // stop processing silently
        }
        console.error('[TextAnnotate] AI annotation failed:', aiError);
        throw aiError;
      }

      // Progressive path already rendered in-place; do not re-render final annotation
      const processEndTime = performance.now();
      console.log(
        `[TextAnnotate] Reading mode display completed in ${(processEndTime - processStartTime).toFixed(2)}ms total`,
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'annotation_aborted') {
        console.log('[TextAnnotate] Annotation aborted by user');
        return;
      }
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
    if (this.uiCallbacks) {
      this.uiCallbacks.onHide?.();
    }
    this.cancelCurrentWork(true);
  }

  /**
   * Destroy manager and cleanup
   */
  public destroy(): void {
    if (this.currentAbortController) {
      try {
        this.currentAbortController.abort();
      } catch {
        /* empty */
      }
      this.currentAbortController = null;
    }
    if (this.readingModeUI) {
      this.readingModeUI.destroy();
      this.readingModeUI = null;
    }
    cleanupLanguageDetector();
  }

  private cancelCurrentWork(hideUI: boolean): void {
    try {
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }
    } catch {
      /* empty */
    }
    if (hideUI) {
      if (this.uiCallbacks) {
        this.uiCallbacks.onHide?.();
      } else if (this.readingModeUI) {
        this.readingModeUI.hide();
      }
    }
  }
}
