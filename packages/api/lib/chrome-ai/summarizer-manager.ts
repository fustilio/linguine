/// <reference types="dom-chromium-ai" />

/**
 * Summarizer Manager - Handles Chrome Summarizer API
 */

import { BaseChromeAIManager } from './base-manager.js';
import type { BaseManagerConfig } from './types.js';

export class SummarizerManager extends BaseChromeAIManager<SummarizerManager> {
  private static instance: SummarizerManager | null = null;
  private summarizer: Summarizer | null = null;

  private constructor(config: BaseManagerConfig = {}) {
    super(config);
  }

  public static getInstance(config?: BaseManagerConfig): SummarizerManager {
    if (!SummarizerManager.instance) {
      SummarizerManager.instance = new SummarizerManager(config);
    }
    return SummarizerManager.instance;
  }

  public static resetInstance(): void {
    if (SummarizerManager.instance) {
      SummarizerManager.instance.cleanup();
      SummarizerManager.instance = null;
    }
  }

  public async getSummarizer(): Promise<Summarizer> {
    if (this.isReady() && this.summarizer) {
      return this.summarizer;
    }

    return await this.initialize();
  }

  private async initialize(): Promise<Summarizer> {
    try {
      await this.checkAPIAvailability('Summarizer');

      this.summarizer = await Summarizer.create({});
      this.isInitialized = true;
      return this.summarizer;
    } catch (error) {
      console.error('Failed to initialize summarizer:', error);
      throw error;
    }
  }

  public cleanup(): void {
    if (this.summarizer) {
      this.summarizer.destroy();
      this.summarizer = null;
      this.isInitialized = false;
    }
    this.cleanupCallbacks();
  }

  public isReady(): boolean {
    return this.isInitialized && this.summarizer !== null;
  }
}
