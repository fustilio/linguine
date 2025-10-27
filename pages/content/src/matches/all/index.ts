import { sampleFunction } from '@src/sample-function';
import { WordReplacer } from '@src/word-replacer';

console.log('[CEB] All content script loaded');

void sampleFunction();

// Initialize the word replacer when the script loads
console.log("[CEB] Initializing word replacer");
new WordReplacer();
console.log("[CEB] Word replacer initialized");