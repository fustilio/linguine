/// <reference types="dom-chromium-ai" />

/**
 * Base manager class with common functionality for Chrome AI APIs
 * Reduces code duplication across different API managers
 */

import type { DownloadProgressCallback, SessionStatusCallback, BaseManagerConfig } from './types.js';

export abstract class BaseChromeAIManager<T> {
  protected downloadProgressCallbacks: Set<DownloadProgressCallback> = new Set();
  protected statusCallbacks: Set<SessionStatusCallback> = new Set();
  protected config: Required<BaseManagerConfig>;
  protected isInitialized = false;

  constructor(config: BaseManagerConfig = {}) {
    this.config = {
      enableDownloadProgress: config.enableDownloadProgress ?? true,
    };
  }

  /**
   * Add callback for download progress updates
   */
  public onDownloadProgress(callback: DownloadProgressCallback): () => void {
    this.downloadProgressCallbacks.add(callback);
    return () => this.downloadProgressCallbacks.delete(callback);
  }

  /**
   * Add callback for session status updates
   */
  public onStatusUpdate(callback: SessionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  protected notifyDownloadProgress(progress: number): void {
    this.downloadProgressCallbacks.forEach(callback => callback(progress));
  }

  protected notifyStatus(status: 'initializing' | 'ready' | 'downloading' | 'error', message?: string): void {
    this.statusCallbacks.forEach(callback => callback(status, message));
  }

  /**
   * Check if Chrome AI API is available
   */
  protected async checkAPIAvailability(apiName: string, availabilityCheck?: () => Promise<string>): Promise<void> {
    if (typeof (globalThis as any)[apiName] === 'undefined') {
      throw new Error(`${apiName} API not available. Enable the required Chrome flag`);
    }

    if (availabilityCheck) {
      const availability = await availabilityCheck();
      if (availability === 'unavailable') {
        throw new Error(`${apiName} is not supported on this device`);
      }
    }
  }

  /**
   * Add download progress monitoring to options if enabled
   */
  protected addDownloadProgressMonitor(options: any): void {
    if (this.config.enableDownloadProgress) {
      options.monitor = (monitor: any) => {
        this.notifyStatus('downloading', 'Downloading AI model...');
        monitor.addEventListener('downloadprogress', (event: ProgressEvent) => {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.notifyDownloadProgress(progress);
        });
      };
    }
  }

  /**
   * Clean up callbacks
   */
  protected cleanupCallbacks(): void {
    this.downloadProgressCallbacks.clear();
    this.statusCallbacks.clear();
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  public abstract cleanup(): void;
  public abstract isReady(): boolean;
}
