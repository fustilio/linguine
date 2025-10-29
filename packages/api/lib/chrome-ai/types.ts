/// <reference types="dom-chromium-ai" />

/**
 * Shared types and interfaces for Chrome AI APIs
 */

export interface DownloadProgressCallback {
  (progress: number): void;
}

export interface SessionStatusCallback {
  (status: 'initializing' | 'ready' | 'downloading' | 'error', message?: string): void;
}

export interface ChromeAISession {
  id: string;
  model: LanguageModel;
  createdAt: Date;
  lastUsed: Date;
  inputUsage: number;
  inputQuota: number;
  systemPrompt?: string;
}

export interface ChromeAIManagerConfig {
  maxSessions?: number;
  sessionTimeout?: number; // milliseconds
  enableDownloadProgress?: boolean;
  enableSessionRestoration?: boolean;
}

export interface BaseManagerConfig {
  enableDownloadProgress?: boolean;
}

export interface ManagerInstance<T> {
  getInstance(config?: any): T;
  resetInstance(): void;
}
