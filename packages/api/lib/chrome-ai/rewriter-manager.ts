/// <reference types="dom-chromium-ai" />

/**
 * Rewriter Manager - Handles Chrome Rewriter API with options management
 */

import { BaseChromeAIManager } from './base-manager.js';
import { DEFAULT_REWRITER_PROMPT } from '@extension/storage';
import type { BaseManagerConfig } from './types.js';

export class RewriterManager extends BaseChromeAIManager<RewriterManager> {
  private static instance: RewriterManager | null = null;
  private rewriter: Rewriter | null = null;
  private currentOptions: RewriterCreateOptions | null = null;

  /** Set options; returns the active Rewriter instance, reinitializing if changed. */
  public async setOptions(options?: RewriterCreateOptions): Promise<Rewriter> {
    const changed = JSON.stringify(this.currentOptions) !== JSON.stringify(options);
    if (!changed && this.rewriter && this.isReady()) return this.rewriter;
    return await this.getRewriter(options);
  }

  /** Returns the current options used to create the Rewriter. */
  public getCurrentOptions(): RewriterCreateOptions | null {
    return this.currentOptions ? { ...this.currentOptions } : null;
  }

  private constructor(config: BaseManagerConfig = {}) {
    super(config);
  }

  public static getInstance(config?: BaseManagerConfig): RewriterManager {
    if (!RewriterManager.instance) {
      RewriterManager.instance = new RewriterManager(config);
    }
    return RewriterManager.instance;
  }

  public static resetInstance(): void {
    if (RewriterManager.instance) {
      RewriterManager.instance.cleanup();
      RewriterManager.instance = null;
    }
  }

  public async getRewriter(options?: RewriterCreateOptions): Promise<Rewriter> {
    // Check if we need to reinitialize based on options change
    const optionsChanged = JSON.stringify(this.currentOptions) !== JSON.stringify(options);

    if (this.isReady() && this.rewriter && !optionsChanged) {
      return this.rewriter;
    }

    return await this.initialize(options);
  }

  private async initialize(options?: RewriterCreateOptions): Promise<Rewriter> {
    try {
      await this.checkAPIAvailability('Rewriter', async () => Rewriter.availability());

      // Destroy existing rewriter if options changed
      if (this.rewriter) {
        this.rewriter.destroy();
      }

      // we hack the options like this because right now only en/ja/es is supported
      // but from experiments other languages work too, but maybe are not yet stable.
      // we then use the prompt to specify the output language.
      const hackedOptions = {
        ...options,
        sharedContext:
          (options?.sharedContext ?? DEFAULT_REWRITER_PROMPT) + ` Output should be in ${options?.outputLanguage}`,
      } satisfies RewriterCreateOptions;

      delete hackedOptions.expectedContextLanguages;
      delete hackedOptions.expectedInputLanguages;
      delete hackedOptions.outputLanguage;

      console.log('initializing rewriter with the following options', hackedOptions);

      this.rewriter = await Rewriter.create(hackedOptions || {});
      this.currentOptions = options || null;

      // Wait for rewriter to be ready if supported
      const readyProp = (this.rewriter as unknown as { ready?: Promise<void> }).ready;
      if (readyProp && typeof readyProp.then === 'function') {
        await readyProp;
      }

      this.isInitialized = true;
      return this.rewriter;
    } catch (error) {
      console.error('Failed to initialize rewriter:', error);
      throw error;
    }
  }

  public cleanup(): void {
    if (this.rewriter) {
      this.rewriter.destroy();
      this.rewriter = null;
      this.isInitialized = false;
      this.currentOptions = null;
    }
    this.cleanupCallbacks();
  }

  public isReady(): boolean {
    return this.isInitialized && this.rewriter !== null;
  }
}
