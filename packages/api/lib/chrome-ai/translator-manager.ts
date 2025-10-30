/// <reference types="dom-chromium-ai" />

/**
 * Translator Manager - Handles Chrome Translator API with language pair management
 */

import { BaseChromeAIManager } from './base-manager.js';
import type { BaseManagerConfig } from './types.js';

export class TranslatorManager extends BaseChromeAIManager<TranslatorManager> {
  private static instance: TranslatorManager | null = null;
  private translators: Map<string, Translator> = new Map();

  private constructor(config: BaseManagerConfig = {}) {
    super(config);
  }

  public static getInstance(config?: BaseManagerConfig): TranslatorManager {
    if (!TranslatorManager.instance) {
      TranslatorManager.instance = new TranslatorManager(config);
    }
    return TranslatorManager.instance;
  }

  public static resetInstance(): void {
    if (TranslatorManager.instance) {
      TranslatorManager.instance.cleanup();
      TranslatorManager.instance = null;
    }
  }

  private getLanguagePairKey(sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}-${targetLanguage}`;
  }

  public async getTranslator(sourceLanguage: string, targetLanguage: string): Promise<Translator> {
    const key = this.getLanguagePairKey(sourceLanguage, targetLanguage);

    if (this.translators.has(key)) {
      return this.translators.get(key)!;
    }

    return await this.createTranslator(sourceLanguage, targetLanguage);
  }

  private async createTranslator(sourceLanguage: string, targetLanguage: string): Promise<Translator> {
    try {
      await this.checkAPIAvailability(
        'Translator',
        async () =>
          await Translator.availability({
            sourceLanguage,
            targetLanguage,
          }),
      );

      const translator = await Translator.create({
        sourceLanguage,
        targetLanguage,
      });

      const key = this.getLanguagePairKey(sourceLanguage, targetLanguage);
      this.translators.set(key, translator);

      return translator;
    } catch (error) {
      console.error('Failed to create translator:', error);
      throw error;
    }
  }

  public cleanup(): void {
    for (const translator of this.translators.values()) {
      translator.destroy();
    }
    this.translators.clear();
    this.cleanupCallbacks();
  }

  public isReady(): boolean {
    return this.translators.size > 0;
  }
}
