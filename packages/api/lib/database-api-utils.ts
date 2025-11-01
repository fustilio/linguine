// Database API Utilities
// Shared utilities for message passing to offscreen document

import { LanguageCodeSchema } from '@extension/shared';
import pRetry from 'p-retry';
import { z } from 'zod';

interface DatabaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Zod schemas for database message validation

/**
 * Message target types - specifies which component should handle the message
 */
type MessageTarget = 'background' | 'offscreen' | 'sidepanel' | 'content' | 'popup' | 'options';

/**
 * Base database request schema with explicit target
 */
const DatabaseRequestSchema = z.object({
  action: z.string(),
  target: z.enum(['background', 'offscreen', 'sidepanel', 'content', 'popup', 'options']).optional(),
  data: z.unknown().optional(),
});

/**
 * Generic database response schema
 */
const DatabaseResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

/**
 * Text Rewrite schemas
 */
const TextRewriteSchema = z.object({
  id: z.number(),
  original_text: z.string(),
  rewritten_text: z.string(),
  language: z.string(),
  rewriter_settings: z.string(),
  source_url: z.string(),
  url_fragment: z.string().nullable(),
  original_readability_score: z.number(),
  rewritten_readability_score: z.number(),
  created_at: z.string(),
});

const TextRewriteDataSchema = z.object({
  original_text: z.string().min(1),
  rewritten_text: z.string().min(1),
  language: LanguageCodeSchema,
  rewriter_settings: z.string(),
  source_url: z.string().url(),
  url_fragment: z.string().nullable().optional(),
});

const TextRewriteFiltersSchema = z.object({
  language: LanguageCodeSchema.optional(),
  minReadability: z.number().min(0).max(100).optional(),
  maxReadability: z.number().min(0).max(100).optional(),
  recentDays: z.number().positive().optional(),
  sourceUrl: z.string().url().optional(),
});

const AddTextRewriteRequestSchema = z.object({
  action: z.literal('addTextRewrite'),
  target: z
    .enum(['background', 'offscreen', 'sidepanel', 'content', 'popup', 'options'])
    .optional()
    .default('offscreen'),
  data: TextRewriteDataSchema,
});

const GetTextRewritesRequestSchema = z.object({
  action: z.literal('getTextRewrites'),
  data: z.object({
    page: z.number().positive().optional(),
    limit: z.number().positive().optional(),
    filters: TextRewriteFiltersSchema.optional(),
  }),
});

const GetTextRewriteCountRequestSchema = z.object({
  action: z.literal('getTextRewriteCount'),
  data: z.object({
    filters: TextRewriteFiltersSchema.optional(),
  }),
});

const DeleteTextRewriteRequestSchema = z.object({
  action: z.literal('deleteTextRewrite'),
  data: z.object({
    id: z.number().positive(),
  }),
});

const DeleteTextRewritesRequestSchema = z.object({
  action: z.literal('deleteTextRewrites'),
  data: z.object({
    ids: z.array(z.number().positive()),
  }),
});

const GetTextRewriteByIdRequestSchema = z.object({
  action: z.literal('getTextRewriteById'),
  data: z.object({
    id: z.number().positive(),
  }),
});

const GetTextRewritesByLanguageRequestSchema = z.object({
  action: z.literal('getTextRewritesByLanguage'),
  data: z.object({
    language: LanguageCodeSchema,
  }),
});

const GetRecentTextRewritesRequestSchema = z.object({
  action: z.literal('getRecentTextRewrites'),
  data: z.object({
    days: z.number().positive(),
    language: LanguageCodeSchema.optional(),
  }),
});

const GetTextRewritesByUrlRequestSchema = z.object({
  action: z.literal('getTextRewritesByUrl'),
  data: z.object({
    url: z.string().url(),
  }),
});

const GetTextRewritesByReadabilityRequestSchema = z.object({
  action: z.literal('getTextRewritesByReadability'),
  data: z.object({
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100),
    language: LanguageCodeSchema.optional(),
  }),
});

/**
 * Vocabulary schemas
 */
const VocabularyItemSchema = z.object({
  id: z.number(),
  text: z.string(),
  language: z.string(),
  knowledge_level: z.number(),
  last_reviewed_at: z.string(),
  created_at: z.string(),
});

const NewVocabularyItemSchema = z.object({
  text: z.string().min(1),
  language: LanguageCodeSchema,
});

const AddVocabularyItemRequestSchema = z.object({
  action: z.literal('addVocabularyItem'),
  data: NewVocabularyItemSchema,
});

const DeleteVocabularyItemRequestSchema = z.object({
  action: z.literal('deleteVocabularyItem'),
  data: z.object({
    id: z.number().positive(),
  }),
});

const DeleteVocabularyItemsRequestSchema = z.object({
  action: z.literal('deleteVocabularyItems'),
  data: z.object({
    ids: z.array(z.number().positive()),
  }),
});

const UpdateVocabularyItemKnowledgeLevelRequestSchema = z.object({
  action: z.literal('updateVocabularyItemKnowledgeLevel'),
  data: z.object({
    id: z.number().positive(),
    level: z.number().int().min(1).max(5),
  }),
});

const UpdateVocabularyItemKnowledgeLevelsRequestSchema = z.object({
  action: z.literal('updateVocabularyItemKnowledgeLevels'),
  data: z.object({
    ids: z.array(z.number().positive()),
    levelChange: z.union([z.literal(1), z.literal(-1)]),
  }),
});

const GetVocabularyRequestSchema = z.object({
  action: z.literal('getVocabulary'),
  data: z.object({
    page: z.number().positive().optional(),
    limit: z.number().positive().optional(),
    languageFilter: LanguageCodeSchema.nullable().optional(),
  }),
});

const GetVocabularyCountRequestSchema = z.object({
  action: z.literal('getVocabularyCount'),
  data: z.object({
    languageFilter: LanguageCodeSchema.nullable().optional(),
  }),
});

const GetVocabularyWordsInTextRequestSchema = z.object({
  action: z.literal('getVocabularyWordsInText'),
  data: z.object({
    textId: z.number().positive(),
  }),
});

const GetTextRewritesContainingWordRequestSchema = z.object({
  action: z.literal('getTextRewritesContainingWord'),
  data: z.object({
    vocabularyId: z.number().positive(),
  }),
});

const GetReviewQueueRequestSchema = z.object({
  action: z.literal('getReviewQueue'),
  data: z
    .object({
      limit: z.number().positive().optional(),
      language: LanguageCodeSchema.nullable().optional(),
    })
    .optional(),
});

const MarkAsReviewedRequestSchema = z.object({
  action: z.literal('markAsReviewed'),
  data: z.object({
    id: z.number().positive(),
  }),
});

const GetNextReviewDateRequestSchema = z.object({
  action: z.literal('getNextReviewDate'),
  data: z
    .object({
      language: LanguageCodeSchema.nullable().optional(),
    })
    .optional(),
});

/**
 * Union of all request schemas
 */
const DatabaseActionRequestSchema = z.discriminatedUnion('action', [
  AddTextRewriteRequestSchema,
  GetTextRewritesRequestSchema,
  GetTextRewriteCountRequestSchema,
  DeleteTextRewriteRequestSchema,
  DeleteTextRewritesRequestSchema,
  GetTextRewriteByIdRequestSchema,
  GetTextRewritesByLanguageRequestSchema,
  GetRecentTextRewritesRequestSchema,
  GetTextRewritesByUrlRequestSchema,
  GetTextRewritesByReadabilityRequestSchema,
  AddVocabularyItemRequestSchema,
  DeleteVocabularyItemRequestSchema,
  DeleteVocabularyItemsRequestSchema,
  UpdateVocabularyItemKnowledgeLevelRequestSchema,
  UpdateVocabularyItemKnowledgeLevelsRequestSchema,
  GetVocabularyRequestSchema,
  GetVocabularyCountRequestSchema,
  GetVocabularyWordsInTextRequestSchema,
  GetTextRewritesContainingWordRequestSchema,
  GetReviewQueueRequestSchema,
  MarkAsReviewedRequestSchema,
  GetNextReviewDateRequestSchema,
  z.object({ action: z.literal('getAllVocabularyForSummary') }),
  z.object({ action: z.literal('resetVocabularyDatabase') }),
  z.object({ action: z.literal('populateDummyVocabulary') }),
  z.object({ action: z.literal('clearAllTextRewrites') }),
  z.object({ action: z.literal('resetTextRewritesDatabase') }),
  z.object({ action: z.literal('ensureDatabaseInitialized') }),
  z.object({ action: z.literal('migrateLanguageCodes') }),
]);

/**
 * Response schemas
 */
const TextRewriteResponseSchema = DatabaseResponseSchema(TextRewriteSchema);
const TextRewritesArrayResponseSchema = DatabaseResponseSchema(z.array(TextRewriteSchema));
const VocabularyItemResponseSchema = DatabaseResponseSchema(VocabularyItemSchema);
const VocabularyItemsArrayResponseSchema = DatabaseResponseSchema(z.array(VocabularyItemSchema));
const BooleanResponseSchema = DatabaseResponseSchema(z.boolean());
const NumberResponseSchema = DatabaseResponseSchema(z.number());

/**
 * Check if the extension context is still valid
 */
const isExtensionContextValid = (): boolean => {
  try {
    // Try to access chrome.runtime to check if context is valid
    return chrome.runtime && chrome.runtime.id !== undefined;
  } catch {
    return false;
  }
};

/**
 * Ensure offscreen document exists before sending messages
 */
const ensureOffscreenDocument = async (): Promise<void> => {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ensureOffscreenDocument',
      target: 'background',
    });
    if (!response || !response.success) {
      throw new Error('Failed to ensure offscreen document exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure offscreen document:', error);
    throw error;
  }
};

/**
 * Generic function to send messages directly to the offscreen document with retry logic
 */
const sendDatabaseMessage = async <T = unknown>(action: string, data?: unknown): Promise<DatabaseResponse<T>> => {
  // Ensure offscreen document exists (only on first attempt)
  await ensureOffscreenDocument();

  try {
    return await pRetry(
      async () => {
        // Check if extension context is valid before sending message
        if (!isExtensionContextValid()) {
          throw new Error('Extension context invalidated');
        }

        // Send directly to offscreen document
        const response = await chrome.runtime.sendMessage({
          action,
          target: 'offscreen', // Send directly to offscreen
          data,
        });

        // Check if response exists and has the expected structure
        if (response && typeof response === 'object' && 'success' in response) {
          if (response.success) {
            return response;
          } else {
            console.error(`❌ Failed to execute ${action}:`, response.error);
            return { success: false, error: response.error };
          }
        } else {
          // Response is null/undefined or doesn't have expected structure
          console.error(`❌ No valid response received for ${action}. Response:`, response);
          throw new Error('No valid response received from offscreen document');
        }
      },
      {
        retries: 2,
        minTimeout: 1000,
        onFailedAttempt: error => {
          const errorMessage = error.message;
          // Only retry on extension context invalidation errors
          if (
            !errorMessage.includes('Extension context invalidated') &&
            !errorMessage.includes('Receiving end does not exist') &&
            !errorMessage.includes('Could not establish connection')
          ) {
            throw error; // Don't retry for other errors
          }
          console.log(
            `🔄 Retrying ${action}... (attempt ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber})`,
          );
        },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error sending message for ${action}:`, errorMessage);

    // If retries exhausted, return error response
    if (
      errorMessage.includes('Extension context invalidated') ||
      errorMessage.includes('Receiving end does not exist') ||
      errorMessage.includes('Could not establish connection')
    ) {
      return {
        success: false,
        error: 'Extension context invalidated. Please reload the extension or refresh the page.',
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Generic function to send messages that return arrays
 */
const sendDatabaseMessageForArray = async <T = unknown>(action: string, data?: unknown): Promise<T[]> => {
  const response = await sendDatabaseMessage<T[]>(action, data);
  return response.success ? response.data || [] : [];
};

/**
 * Generic function to send messages that return single items
 */
const sendDatabaseMessageForItem = async <T = unknown>(
  action: string,
  data?: unknown,
  responseSchema?: z.ZodType<T>,
): Promise<T | null> => {
  const response = await sendDatabaseMessage<T>(action, data);

  if (response.success && response.data) {
    // Validate response data if schema is provided
    if (responseSchema) {
      try {
        const validatedData = responseSchema.parse(response.data);
        return validatedData;
      } catch (error) {
        console.error(`❌ Response validation failed for ${action}:`, error);
        console.error('Invalid response data:', response.data);
        return null;
      }
    }
    return response.data;
  }

  return null;
};

/**
 * Generic function to send messages that return booleans
 */
const sendDatabaseMessageForBoolean = async (action: string, data?: unknown): Promise<boolean> => {
  const response = await sendDatabaseMessage(action, data);
  return response.success;
};

/**
 * Generic function to send messages that return numbers
 */
const sendDatabaseMessageForNumber = async (action: string, data?: unknown): Promise<number> => {
  const response = await sendDatabaseMessage<number>(action, data);
  return response.success ? response.data || 0 : 0;
};

// Export all types
export type { DatabaseResponse, MessageTarget };

// Export all schemas and functions
export {
  DatabaseRequestSchema,
  DatabaseResponseSchema,
  TextRewriteSchema,
  TextRewriteDataSchema,
  TextRewriteFiltersSchema,
  AddTextRewriteRequestSchema,
  GetTextRewritesRequestSchema,
  GetTextRewriteCountRequestSchema,
  DeleteTextRewriteRequestSchema,
  DeleteTextRewritesRequestSchema,
  GetTextRewriteByIdRequestSchema,
  GetTextRewritesByLanguageRequestSchema,
  GetRecentTextRewritesRequestSchema,
  GetTextRewritesByUrlRequestSchema,
  GetTextRewritesByReadabilityRequestSchema,
  VocabularyItemSchema,
  NewVocabularyItemSchema,
  AddVocabularyItemRequestSchema,
  DeleteVocabularyItemRequestSchema,
  DeleteVocabularyItemsRequestSchema,
  UpdateVocabularyItemKnowledgeLevelRequestSchema,
  UpdateVocabularyItemKnowledgeLevelsRequestSchema,
  GetVocabularyRequestSchema,
  GetVocabularyCountRequestSchema,
  GetVocabularyWordsInTextRequestSchema,
  GetTextRewritesContainingWordRequestSchema,
  DatabaseActionRequestSchema,
  TextRewriteResponseSchema,
  TextRewritesArrayResponseSchema,
  VocabularyItemResponseSchema,
  VocabularyItemsArrayResponseSchema,
  BooleanResponseSchema,
  NumberResponseSchema,
  sendDatabaseMessage,
  sendDatabaseMessageForArray,
  sendDatabaseMessageForItem,
  sendDatabaseMessageForBoolean,
  sendDatabaseMessageForNumber,
};
