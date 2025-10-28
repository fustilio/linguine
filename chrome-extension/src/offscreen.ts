// offscreen.ts - Handles all database operations via OPFS

import {
  // Vocabulary operations
  getAllVocabularyForSummary,
  addVocabularyItem,
  deleteVocabularyItem,
  deleteVocabularyItems,
  updateVocabularyItemKnowledgeLevel,
  updateVocabularyItemKnowledgeLevels,
  getVocabulary,
  getVocabularyCount,
  resetVocabularyDatabase,
  populateDummyVocabulary,
  ensureDatabaseInitialized,
  
  // Sentence rewrites operations
  addSentenceRewrite,
  getSentenceRewrites,
  getSentenceRewriteCount,
  deleteSentenceRewrite,
  deleteSentenceRewrites,
  clearAllSentenceRewrites,
  getSentenceRewriteById,
  getSentenceRewritesByLanguage,
  getRecentSentenceRewrites,
  getSentenceRewritesByUrl,
  getSentenceRewritesByReadability,
  getVocabularyWordsInSentence,
  getSentencesContainingWord,
  resetSentenceRewritesDatabase,
} from '@extension/sqlite';
import { getDatabaseManager } from '@extension/sqlite/lib/database-manager.js';

console.log('Offscreen document loaded');

// Initialize database on startup
async function initializeDatabase() {
  try {
    const dbManager = getDatabaseManager();
    await dbManager.ensureInitialized();
    console.log('✅ Database initialized in offscreen document');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}

// Initialize database
initializeDatabase();

// Handle messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);

  const handleMessage = async () => {
    try {
      switch (message.action) {
        // Vocabulary operations
        case 'getAllVocabularyForSummary':
          const vocabSummary = await getAllVocabularyForSummary();
          sendResponse({ success: true, data: vocabSummary });
          break;

        case 'addVocabularyItem':
          const newVocabItem = await addVocabularyItem(message.data);
          sendResponse({ success: true, data: newVocabItem });
          break;

        case 'deleteVocabularyItem':
          await deleteVocabularyItem(message.data.id);
          sendResponse({ success: true });
          break;

        case 'deleteVocabularyItems':
          await deleteVocabularyItems(message.data.ids);
          sendResponse({ success: true });
          break;

        case 'updateVocabularyItemKnowledgeLevel':
          await updateVocabularyItemKnowledgeLevel(message.data.id, message.data.level);
          sendResponse({ success: true });
          break;

        case 'updateVocabularyItemKnowledgeLevels':
          await updateVocabularyItemKnowledgeLevels(message.data.ids, message.data.levelChange);
          sendResponse({ success: true });
          break;

        case 'getVocabulary':
          const vocabData = await getVocabulary(message.data.page, message.data.limit, message.data.languageFilter);
          sendResponse({ success: true, data: vocabData });
          break;

        case 'getVocabularyCount':
          const vocabCount = await getVocabularyCount(message.data.languageFilter);
          sendResponse({ success: true, data: vocabCount });
          break;

        case 'resetVocabularyDatabase':
          await resetVocabularyDatabase();
          sendResponse({ success: true });
          break;

        case 'populateDummyVocabulary':
          await populateDummyVocabulary();
          sendResponse({ success: true });
          break;

        // Sentence rewrites operations
        case 'addSentenceRewrite':
          const newRewrite = await addSentenceRewrite(message.data);
          sendResponse({ success: true, data: newRewrite });
          break;

        case 'getSentenceRewrites':
          const rewrites = await getSentenceRewrites(message.data.page, message.data.limit, message.data.filters);
          sendResponse({ success: true, data: rewrites });
          break;

        case 'getSentenceRewriteCount':
          const rewriteCount = await getSentenceRewriteCount(message.data.filters);
          sendResponse({ success: true, data: rewriteCount });
          break;

        case 'deleteSentenceRewrite':
          await deleteSentenceRewrite(message.data.id);
          sendResponse({ success: true });
          break;

        case 'deleteSentenceRewrites':
          await deleteSentenceRewrites(message.data.ids);
          sendResponse({ success: true });
          break;

        case 'clearAllSentenceRewrites':
          await clearAllSentenceRewrites();
          sendResponse({ success: true });
          break;

        case 'getSentenceRewriteById':
          const rewriteById = await getSentenceRewriteById(message.data.id);
          sendResponse({ success: true, data: rewriteById });
          break;

        case 'getSentenceRewritesByLanguage':
          const rewritesByLang = await getSentenceRewritesByLanguage(message.data.language);
          sendResponse({ success: true, data: rewritesByLang });
          break;

        case 'getRecentSentenceRewrites':
          const recentRewrites = await getRecentSentenceRewrites(message.data.days, message.data.language);
          sendResponse({ success: true, data: recentRewrites });
          break;

        case 'getSentenceRewritesByUrl':
          const rewritesByUrl = await getSentenceRewritesByUrl(message.data.url);
          sendResponse({ success: true, data: rewritesByUrl });
          break;

        case 'getSentenceRewritesByReadability':
          const rewritesByReadability = await getSentenceRewritesByReadability(message.data.minScore, message.data.maxScore, message.data.language);
          sendResponse({ success: true, data: rewritesByReadability });
          break;

        case 'getVocabularyWordsInSentence':
          const vocabInSentence = await getVocabularyWordsInSentence(message.data.sentenceId);
          sendResponse({ success: true, data: vocabInSentence });
          break;

        case 'getSentencesContainingWord':
          const sentencesWithWord = await getSentencesContainingWord(message.data.vocabularyId);
          sendResponse({ success: true, data: sentencesWithWord });
          break;

        case 'resetSentenceRewritesDatabase':
          await resetSentenceRewritesDatabase();
          sendResponse({ success: true });
          break;

        case 'ensureDatabaseInitialized':
          await ensureDatabaseInitialized();
          sendResponse({ success: true });
          break;

        default:
          console.warn('Unknown action:', message.action);
          sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  // Execute async handler
  handleMessage().catch(error => {
    console.error('Error in message handler:', error);
    sendResponse({ success: false, error: 'Internal error' });
  });
  
  return true; // Keep the message channel open
});

console.log('Offscreen document ready');