import { WordReplacer } from '@extension/api';
import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

// Initialize the word replacer when the script loads
console.log('[CEB] Initializing word replacer');
const wordReplacer = WordReplacer.getInstance();
console.log('[CEB] Word replacer initialized');
