export const DEFAULT_REWRITER_PROMPT =
  'I am learning this language. Use simpler vocabulary in its original language so I can understand this text.';

export const DEFAULT_REWRITER_OPTIONS = {
  sharedContext: DEFAULT_REWRITER_PROMPT,
  tone: 'as-is' as const,
  format: 'as-is' as const,
  length: 'shorter' as const,
};

export const DEFAULT_WORD_REPLACER_STATE = {
  isActive: false,
  widgetSize: 'small' as const,
  rewriterOptions: DEFAULT_REWRITER_OPTIONS,
};
