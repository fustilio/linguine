export type RewriterOptions = {
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
  tone?: string;
  format?: string;
  length?: string;
};

export const toBaseLang = (lang: string | undefined): string => {
  const code = lang || 'en-US';
  return code.split('-')[0].toLowerCase();
};

export const buildRewriterOptions = (
  current: RewriterOptions,
  detectedBaseLang?: string,
  nativeBaseLang?: string,
): RewriterOptions => {
  const detected = detectedBaseLang || toBaseLang(current.outputLanguage || 'en');
  const native = nativeBaseLang || current.expectedContextLanguages?.[0] || 'en';
  return {
    sharedContext: current.sharedContext || undefined,
    expectedInputLanguages: [detected],
    expectedContextLanguages: [native],
    outputLanguage: detected,
    tone: current.tone !== 'as-is' ? current.tone : undefined,
    format: current.format !== 'as-is' ? current.format : undefined,
    length: current.length !== 'as-is' ? current.length : undefined,
  };
};


