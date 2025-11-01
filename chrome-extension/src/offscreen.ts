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
  getReviewQueue,
  markAsReviewed,
  getNextReviewDate,

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
// Removed fromError import - using Zod error issues directly to avoid crashes

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
      // Handle undefined/null responseData before validation
      if (responseData === undefined || responseData === null) {
        console.error('Response validation failed: responseData is undefined or null');
        sendResponse({
          success: false,
          error: errorMessage || 'Response data is missing',
        });
        return;
      }

      const validation = schema.safeParse(responseData);
      if (!validation.success) {
        // Extract error message directly from Zod error issues (avoid fromError which can crash)
        const zodError = validation.error;
        let errorMsg: string;
        
        if (zodError?.issues && Array.isArray(zodError.issues) && zodError.issues.length > 0) {
          errorMsg = zodError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        } else {
          errorMsg = errorMessage || 'Validation failed: Invalid response data structure';
        }
        throw new Error(errorMsg);
      }
      result = { success: true, data: validation.data };
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
    const errorMsg =
      validationError instanceof Error ? validationError.message : errorMessage || 'Response validation failed';
    console.error('Response validation failed:', validationError);
    const errorResult = {
      success: false,
      error: errorMsg,
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

  // Check if it's a database action before setting up async handler
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
    'getReviewQueue',
    'markAsReviewed',
    'getNextReviewDate',
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

  // Ignore non-database messages - don't respond, let other handlers process it
  if (!databaseActions.includes(message.action)) {
    return false; // Don't handle, allow other listeners to process it
  }

  // Return true to keep message channel open for async operations
  const handleMessage = async () => {
    try {
      // Validate incoming message structure for database actions
      const baseValidation = DatabaseActionRequestSchema.safeParse(message);
      if (!baseValidation.success) {
        // Extract error message directly from Zod error issues (avoid fromError which can crash)
        const zodError = baseValidation.error;
        const validationError =
          zodError?.issues && Array.isArray(zodError.issues) && zodError.issues.length > 0
            ? new Error(zodError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', '))
            : new Error('Invalid message structure');
        console.error('❌ Invalid database message structure:', validationError.toString());
        console.error('Message:', message);
        sendResponse({
          success: false,
          error: `Invalid message structure: ${validationError.message}`,
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

        case 'getReviewQueue': {
          const reviewQueue = await getReviewQueue(message.data?.limit);
          // Ensure reviewQueue is always an array before validation
          const safeReviewQueue = Array.isArray(reviewQueue) ? reviewQueue : [];
          sendValidatedResponse(sendResponse, safeReviewQueue, VocabularyItemSchema.array(), 'Failed to get review queue');
          break;
        }

        case 'markAsReviewed':
          await markAsReviewed(message.data.id);
          sendResponse({ success: true });
          break;

        case 'getNextReviewDate': {
          const nextReviewDate = await getNextReviewDate();
          // Ensure nextReviewDate is string | null before validation
          const safeNextReviewDate = nextReviewDate !== undefined ? nextReviewDate : null;
          sendValidatedResponse(sendResponse, safeNextReviewDate, z.string().nullable(), 'Failed to get next review date');
          break;
        }

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
