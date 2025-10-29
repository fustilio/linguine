/// <reference types="dom-chromium-ai" />

/**
 * Rewriter Manager - Handles Chrome Rewriter API with options management
 */

import { BaseChromeAIManager } from './base-manager.js';
import type { BaseManagerConfig } from './types.js';

export class RewriterManager extends BaseChromeAIManager<RewriterManager> {
  private static instance: RewriterManager | null = null;
  private rewriter: Rewriter | null = null;
  private currentOptions: RewriterCreateOptions | null = null;

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
      await this.checkAPIAvailability('Rewriter', async () => {
        return await Rewriter.availability();
      });

      // Destroy existing rewriter if options changed
      if (this.rewriter) {
        this.rewriter.destroy();
      }

      this.rewriter = await Rewriter.create(options || {});
      this.currentOptions = options || null;
      
      // Wait for rewriter to be ready
      if ('ready' in this.rewriter) {
        await (this.rewriter as any).ready;
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
