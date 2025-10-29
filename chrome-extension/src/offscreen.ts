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
  
  // Text rewrites operations
  addTextRewrite,
  getTextRewrites,
  getTextRewriteCount,
  deleteTextRewrite,
  deleteTextRewrites,
  clearAllTextRewrites,
  getTextRewriteById,
  getTextRewritesByLanguage,
  getRecentTextRewrites,
  getTextRewritesByUrl,
  getTextRewritesByReadability,
  getVocabularyWordsInText,
  getTextRewritesContainingWord,
  resetTextRewritesDatabase,
  migrateLanguageCodes,

  getDatabaseManager
} from '@extension/sqlite';

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
      // Handle messages with the new format (type, target, data)
      if (message.type && message.target === 'offscreen') {
        switch (message.type) {
          case 'ping':
            sendResponse({ success: true, pong: true, message: 'Offscreen document is ready' });
            return;
          
          default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
            return;
        }
      }

      // Handle legacy action-based messages
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

        // Text rewrites operations
        case 'addTextRewrite':
          const newRewrite = await addTextRewrite(message.data);
          sendResponse({ success: true, data: newRewrite });
          break;

        case 'getTextRewrites':
          const rewrites = await getTextRewrites(message.data.page, message.data.limit, message.data.filters);
          sendResponse({ success: true, data: rewrites });
          break;

        case 'getTextRewriteCount':
          const rewriteCount = await getTextRewriteCount(message.data.filters);
          sendResponse({ success: true, data: rewriteCount });
          break;

        case 'deleteTextRewrite':
          await deleteTextRewrite(message.data.id);
          sendResponse({ success: true });
          break;

        case 'deleteTextRewrites':
          await deleteTextRewrites(message.data.ids);
          sendResponse({ success: true });
          break;

        case 'clearAllTextRewrites':
          await clearAllTextRewrites();
          sendResponse({ success: true });
          break;

        case 'getTextRewriteById':
          const rewriteById = await getTextRewriteById(message.data.id);
          sendResponse({ success: true, data: rewriteById });
          break;

        case 'getTextRewritesByLanguage':
          const rewritesByLang = await getTextRewritesByLanguage(message.data.language);
          sendResponse({ success: true, data: rewritesByLang });
          break;

        case 'getRecentTextRewrites':
          const recentRewrites = await getRecentTextRewrites(message.data.days, message.data.language);
          sendResponse({ success: true, data: recentRewrites });
          break;

        case 'getTextRewritesByUrl':
          const rewritesByUrl = await getTextRewritesByUrl(message.data.url);
          sendResponse({ success: true, data: rewritesByUrl });
          break;

        case 'getTextRewritesByReadability':
          const rewritesByReadability = await getTextRewritesByReadability(message.data.minScore, message.data.maxScore, message.data.language);
          sendResponse({ success: true, data: rewritesByReadability });
          break;

        case 'getVocabularyWordsInText':
          const vocabInText = await getVocabularyWordsInText(message.data.textId);
          sendResponse({ success: true, data: vocabInText });
          break;

        case 'getTextRewritesContainingWord':
          const textRewritesWithWord = await getTextRewritesContainingWord(message.data.vocabularyId);
          sendResponse({ success: true, data: textRewritesWithWord });
          break;

        case 'resetTextRewritesDatabase':
          await resetTextRewritesDatabase();
          sendResponse({ success: true });
          break;

        case 'ensureDatabaseInitialized':
          await ensureDatabaseInitialized();
          sendResponse({ success: true });
          break;

        case 'migrateLanguageCodes':
          const migrationResult = await migrateLanguageCodes();
          sendResponse({ success: true, data: migrationResult });
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