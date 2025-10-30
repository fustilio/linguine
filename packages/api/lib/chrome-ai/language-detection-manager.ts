/// <reference types="dom-chromium-ai" />

/**
 * Language Detection Manager - Handles Chrome Language Detection API with options management
 */

import { BaseChromeAIManager } from './base-manager.js';
import type { BaseManagerConfig } from './types.js';

export class LanguageDetectionManager extends BaseChromeAIManager<LanguageDetectionManager> {
  private static instance: LanguageDetectionManager | null = null;
  private languageDetector: LanguageDetector | null = null;
  private currentOptions: LanguageDetectorCreateOptions | null = null;

  private constructor(config: BaseManagerConfig = {}) {
    super(config);
  }

  public static getInstance(config?: BaseManagerConfig): LanguageDetectionManager {
    if (!LanguageDetectionManager.instance) {
      LanguageDetectionManager.instance = new LanguageDetectionManager(config);
    }
    return LanguageDetectionManager.instance;
  }

  public static resetInstance(): void {
    if (LanguageDetectionManager.instance) {
      LanguageDetectionManager.instance.cleanup();
      LanguageDetectionManager.instance = null;
    }
  }

  public async getLanguageDetector(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector> {
    // Check if we need to reinitialize based on options change
    const optionsChanged = JSON.stringify(this.currentOptions) !== JSON.stringify(options);

    if (this.isReady() && this.languageDetector && !optionsChanged) {
      return this.languageDetector;
    }

    return await this.initialize(options);
  }

  private async initialize(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector> {
    try {
      await this.checkAPIAvailability('LanguageDetector', async () => await LanguageDetector.availability());

      // Destroy existing languageDetector if options changed
      if (this.languageDetector) {
        this.languageDetector.destroy();
      }

      this.languageDetector = await LanguageDetector.create(options || {});
      this.currentOptions = options || null;

      // Wait for languageDetector to be ready
      if ('ready' in this.languageDetector) {
        await (this.languageDetector as { ready: Promise<void> }).ready;
      }

      this.isInitialized = true;
      return this.languageDetector;
    } catch (error) {
      console.error('Failed to initialize rewriter:', error);
      throw error;
    }
  }

  public cleanup(): void {
    if (this.languageDetector) {
      this.languageDetector.destroy();
      this.languageDetector = null;
      this.isInitialized = false;
      this.currentOptions = null;
    }
    this.cleanupCallbacks();
  }

  public isReady(): boolean {
    return this.isInitialized && this.languageDetector !== null;
  }
}
