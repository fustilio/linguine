// offscreen.ts - Handles all database operations via OPFS

import { DatabaseActionRequestSchema, TextRewriteSchema, VocabularyItemSchema } from '@extension/api';
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
  getDatabaseManager,
} from '@extension/sqlite';
import { z } from 'zod';

console.log('Offscreen document loaded');

// Initialize database on startup
const initializeDatabase = async () => {
  try {
    const dbManager = getDatabaseManager();
    await dbManager.ensureInitialized();
    console.log('✅ Database initialized in offscreen document');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
};

// Initialize database
initializeDatabase();

// Helper function to validate and send response
const sendValidatedResponse = <T>(
  sendResponse: (response: { success: boolean; data?: unknown; error?: string }) => void,
  responseData: T,
  schema?: z.ZodType<T>,
  errorMessage?: string,
): void => {
  try {
    let result: { success: boolean; data?: unknown; error?: string };

    if (schema) {
      const validated = schema.parse(responseData);
      result = { success: true, data: validated };
    } else {
      result = { success: true, data: responseData };
    }

    try {
      sendResponse(result);
    } catch (responseError) {
      console.error('Failed to send validated response:', responseError);
      throw responseError;
    }
  } catch (validationError) {
    console.error('Response validation failed:', validationError);
    const errorResult = {
      success: false,
      error: errorMessage || 'Response validation failed',
    };
    try {
      sendResponse(errorResult);
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
    }
  }
};

// Handle messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ignore messages not intended for offscreen
  if (message.target && message.target !== 'offscreen') {
    return false;
  }

  // Return true to keep message channel open for async operations
  const handleMessage = async () => {
    try {
      // If no target is specified, check if it's a database action
      // (for backward compatibility with messages that don't have explicit target)
      const databaseActions = [
        'getAllVocabularyForSummary',
        'addVocabularyItem',
        'deleteVocabularyItem',
        'deleteVocabularyItems',
        'updateVocabularyItemKnowledgeLevel',
        'updateVocabularyItemKnowledgeLevels',
        'getVocabulary',
        'getVocabularyCount',
        'resetVocabularyDatabase',
        'populateDummyVocabulary',
        'ensureDatabaseInitialized',
        'addTextRewrite',
        'getTextRewrites',
        'getTextRewriteCount',
        'deleteTextRewrite',
        'deleteTextRewrites',
        'clearAllTextRewrites',
        'getTextRewriteById',
        'getTextRewritesByLanguage',
        'getRecentTextRewrites',
        'getTextRewritesByUrl',
        'getTextRewritesByReadability',
        'getVocabularyWordsInText',
        'getTextRewritesContainingWord',
        'resetTextRewritesDatabase',
        'migrateLanguageCodes',
      ];

      // Ignore non-database messages
      if (!databaseActions.includes(message.action)) {
        sendResponse({ success: false, error: `Unknown action: ${message.action}` });
        return;
      }

      // Validate incoming message structure for database actions
      const baseValidation = DatabaseActionRequestSchema.safeParse(message);
      if (!baseValidation.success) {
        console.error('❌ Invalid database message structure:', baseValidation.error);
        console.error('Message:', message);
        sendResponse({
          success: false,
          error: `Invalid message structure: ${baseValidation.error.message}`,
        });
        return;
      }

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

      // Handle legacy action-based messages with validation
      switch (message.action) {
        // Vocabulary operations
        case 'getAllVocabularyForSummary': {
          const vocabSummary = await getAllVocabularyForSummary();
          sendValidatedResponse(
            sendResponse,
            vocabSummary,
            VocabularyItemSchema.array(),
            'Failed to get vocabulary summary',
          );
          break;
        }

        case 'addVocabularyItem': {
          const newVocabItem = await addVocabularyItem(message.data);
          sendValidatedResponse(sendResponse, newVocabItem, VocabularyItemSchema, 'Failed to add vocabulary item');
          break;
        }

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

        case 'getVocabulary': {
          const vocabData = await getVocabulary(message.data.page, message.data.limit, message.data.languageFilter);
          sendValidatedResponse(sendResponse, vocabData, VocabularyItemSchema.array(), 'Failed to get vocabulary');
          break;
        }

        case 'getVocabularyCount': {
          const vocabCount = await getVocabularyCount(message.data.languageFilter);
          sendValidatedResponse(sendResponse, vocabCount, z.number(), 'Failed to get vocabulary count');
          break;
        }

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
          try {
            const newRewrite = await addTextRewrite(message.data);
            if (newRewrite) {
              sendValidatedResponse(sendResponse, newRewrite, TextRewriteSchema, 'Failed to add text rewrite');
            } else {
              sendResponse({ success: false, error: 'Failed to add text rewrite: No rewrite returned' });
            }
          } catch (error) {
            console.error('Error in addTextRewrite:', error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          break;

        case 'getTextRewrites': {
          const rewrites = await getTextRewrites(message.data.page, message.data.limit, message.data.filters);
          sendValidatedResponse(sendResponse, rewrites, TextRewriteSchema.array(), 'Failed to get text rewrites');
          break;
        }

        case 'getTextRewriteCount': {
          const rewriteCount = await getTextRewriteCount(message.data.filters);
          sendValidatedResponse(sendResponse, rewriteCount, z.number(), 'Failed to get text rewrite count');
          break;
        }

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

        case 'getTextRewriteById': {
          const rewriteById = await getTextRewriteById(message.data.id);
          if (rewriteById) {
            sendValidatedResponse(sendResponse, rewriteById, TextRewriteSchema, 'Failed to get text rewrite');
          } else {
            sendResponse({ success: true, data: null });
          }
          break;
        }

        case 'getTextRewritesByLanguage': {
          const rewritesByLang = await getTextRewritesByLanguage(message.data.language);
          sendValidatedResponse(
            sendResponse,
            rewritesByLang,
            TextRewriteSchema.array(),
            'Failed to get text rewrites by language',
          );
          break;
        }
        case 'getRecentTextRewrites': {
          const recentRewrites = await getRecentTextRewrites(message.data.days, message.data.language);
          sendValidatedResponse(
            sendResponse,
            recentRewrites,
            TextRewriteSchema.array(),
            'Failed to get recent text rewrites',
          );
          break;
        }
        case 'getTextRewritesByUrl': {
          const rewritesByUrl = await getTextRewritesByUrl(message.data.url);
          sendValidatedResponse(
            sendResponse,
            rewritesByUrl,
            TextRewriteSchema.array(),
            'Failed to get text rewrites by URL',
          );
          break;
        }
        case 'getTextRewritesByReadability': {
          const rewritesByReadability = await getTextRewritesByReadability(
            message.data.minScore,
            message.data.maxScore,
            message.data.language,
          );
          sendValidatedResponse(
            sendResponse,
            rewritesByReadability,
            TextRewriteSchema.array(),
            'Failed to get text rewrites by readability',
          );
          break;
        }
        case 'getVocabularyWordsInText': {
          const vocabInText = await getVocabularyWordsInText(message.data.textId);
          sendValidatedResponse(
            sendResponse,
            vocabInText,
            VocabularyItemSchema.array(),
            'Failed to get vocabulary words in text',
          );
          break;
        }
        case 'getTextRewritesContainingWord': {
          const textRewritesWithWord = await getTextRewritesContainingWord(message.data.vocabularyId);
          sendValidatedResponse(
            sendResponse,
            textRewritesWithWord,
            TextRewriteSchema.array(),
            'Failed to get text rewrites containing word',
          );
          break;
        }
        case 'resetTextRewritesDatabase': {
          await resetTextRewritesDatabase();
          sendResponse({ success: true });
          break;
        }
        case 'ensureDatabaseInitialized': {
          await ensureDatabaseInitialized();
          sendResponse({ success: true });
          break;
        }
        case 'migrateLanguageCodes': {
          const migrationResult = await migrateLanguageCodes();
          sendValidatedResponse(
            sendResponse,
            migrationResult,
            z.object({ updated: z.number(), errors: z.number() }),
            'Failed to migrate language codes',
          );
          break;
        }
        default:
          console.warn('Unknown action:', message.action);
          sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Execute async handler
  handleMessage().catch(error => {
    console.error('Error in message handler:', error);
    try {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      });
    } catch (responseError) {
      // Channel may already be closed
      console.error('Failed to send error response:', responseError);
    }
  });

  return true;
});

console.log('Offscreen document ready');
