/**
 * Chrome AI API Package
 * Centralized management of Chrome's built-in AI capabilities
 */

// Export types and interfaces
export type {
  DownloadProgressCallback,
  SessionStatusCallback,
  ChromeAISession,
  ChromeAIManagerConfig,
  BaseManagerConfig,
  ManagerInstance,
} from './types.js';

// Export managers
export { ChromeAIManager } from './language-model-manager.js';
export { TranslatorManager } from './translator-manager.js';
export { SummarizerManager } from './summarizer-manager.js';
export { RewriterManager } from './rewriter-manager.js';
export { BaseChromeAIManager } from './base-manager.js';

// Export convenience functions and instances
export {
  translateText,
  summarizeText,
  streamSummarizeText,
  rewriteText,
  chromeAIManager,
  translatorManager,
  summarizerManager,
  rewriterManager,
} from './convenience-functions.js';
