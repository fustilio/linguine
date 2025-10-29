export * from './lib/linguini-ai.js';
export * from './lib/chrome-ai-wrapper.js';
export * from './lib/hooks/useVocabulary.js';
export * from './lib/hooks/useTextRewrites.js';
export * from './lib/word-replacer.js';
export * from './lib/floating-widget.js';
export * from './lib/text-rewrites-api.js';
export * from './lib/vocabulary-api.js';
export * from './lib/database-api-utils.js';
export type * from './lib/types.js';
export { QueryClient, QueryClientProvider } from '@tanstack/react-query';
export { FunctionCallingPromptAPI } from './lib/function-calling/function-calling-api.js';
export type {
  FunctionDefinition,
  Message,
  FunctionCallingConfig,
  FunctionCallingError,
} from './lib/function-calling/types.js';
