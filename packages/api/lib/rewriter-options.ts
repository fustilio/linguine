/// <reference types="dom-chromium-ai" />

const toBaseLang = (lang: string | undefined): string => {
  const code = lang || 'en-US';
  return code.split('-')[0].toLowerCase();
};

/**
 * Maps base language codes to full BCP 47 codes supported by Chrome Rewriter API
 * Handles both base codes (e.g., 'zh') and full BCP 47 codes (e.g., 'zh-CN')
 */
const mapBaseLangToBCP47 = (lang: string): string => {
  // If it's already a full BCP 47 code, return it as-is (normalize to expected format)
  if (lang.includes('-')) {
    const normalized = lang.toLowerCase();
    const fullCodeMapping: Record<string, string> = {
      'zh-cn': 'zh-CN',
      'zh-hans': 'zh-CN',
      'th-th': 'th-TH',
      'en-us': 'en-US',
      'es-es': 'es-ES',
      'fr-fr': 'fr-FR',
      'de-de': 'de-DE',
      'ja-jp': 'ja-JP',
      'ko-kr': 'ko-KR',
      'it-it': 'it-IT',
      'pt-br': 'pt-BR',
      'ru-ru': 'ru-RU',
      'ar-sa': 'ar-SA',
      'hi-in': 'hi-IN',
    };
    return fullCodeMapping[normalized] || lang;
  }

  // Map base language codes to full BCP 47 codes
  const baseLangLower = lang.toLowerCase();
  const mapping: Record<string, string> = {
    zh: 'zh-CN',
    th: 'th-TH',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    ko: 'ko-KR',
    it: 'it-IT',
    pt: 'pt-BR',
    ru: 'ru-RU',
    ar: 'ar-SA',
    hi: 'hi-IN',
  };
  return mapping[baseLangLower] || 'en-US';
};

export const buildRewriterOptions = (
  current: Partial<RewriterCreateOptions>,
  detectedBaseLang?: string,
  nativeBaseLang?: string,
): RewriterCreateOptions => {
  // Convert base language codes to full BCP 47 codes for Chrome Rewriter API
  const detectedBase = detectedBaseLang || toBaseLang(current.outputLanguage || 'en');
  const nativeBase = nativeBaseLang || current.expectedContextLanguages?.[0] || 'en';

  // Map to full BCP 47 codes - Chrome Rewriter API requires full codes, not base codes
  const detected = mapBaseLangToBCP47(detectedBase);
  const native = mapBaseLangToBCP47(nativeBase);

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

export { toBaseLang };
