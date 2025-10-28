// Database API Utilities
// Shared utilities for message passing to offscreen document

export interface DatabaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic function to send messages to the offscreen document
 */
export const sendDatabaseMessage = async <T = unknown>(
  action: string,
  data?: unknown
): Promise<DatabaseResponse<T>> => {
  try {
    const response = await chrome.runtime.sendMessage({
      action,
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
      return { 
        success: false, 
        error: 'No valid response received from background script' 
      };
    }
  } catch (error) {
    console.error(`❌ Error sending message for ${action}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Generic function to send messages that return arrays
 */
export const sendDatabaseMessageForArray = async <T = unknown>(
  action: string,
  data?: unknown
): Promise<T[]> => {
  const response = await sendDatabaseMessage<T[]>(action, data);
  return response.success ? response.data || [] : [];
};

/**
 * Generic function to send messages that return single items
 */
export const sendDatabaseMessageForItem = async <T = unknown>(
  action: string,
  data?: unknown
): Promise<T | null> => {
  const response = await sendDatabaseMessage<T>(action, data);
  return response.success ? response.data || null : null;
};

/**
 * Generic function to send messages that return booleans
 */
export const sendDatabaseMessageForBoolean = async (
  action: string,
  data?: unknown
): Promise<boolean> => {
  const response = await sendDatabaseMessage(action, data);
  return response.success;
};

/**
 * Generic function to send messages that return numbers
 */
export const sendDatabaseMessageForNumber = async (
  action: string,
  data?: unknown
): Promise<number> => {
  const response = await sendDatabaseMessage<number>(action, data);
  return response.success ? response.data || 0 : 0;
};
