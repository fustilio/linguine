// Database API Utilities
// Shared utilities for message passing to offscreen document

export interface DatabaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Check if the extension context is still valid
 */
const isExtensionContextValid = (): boolean => {
  try {
    // Try to access chrome.runtime to check if context is valid
    return chrome.runtime && chrome.runtime.id !== undefined;
  } catch (error) {
    return false;
  }
};

/**
 * Generic function to send messages to the offscreen document with retry logic
 */
export const sendDatabaseMessage = async <T = unknown>(
  action: string,
  data?: unknown,
  retryCount: number = 0
): Promise<DatabaseResponse<T>> => {
  const maxRetries = 2;
  
  try {
    // Check if extension context is valid before sending message
    if (!isExtensionContextValid()) {
      throw new Error('Extension context invalidated');
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error sending message for ${action}:`, errorMessage);
    
    // Check if this is an extension context invalidation error
    if (errorMessage.includes('Extension context invalidated') || 
        errorMessage.includes('Receiving end does not exist') ||
        errorMessage.includes('Could not establish connection')) {
      
      // If we haven't exceeded max retries, wait and retry
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying ${action} in 1 second... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendDatabaseMessage<T>(action, data, retryCount + 1);
      } else {
        console.error(`❌ Max retries exceeded for ${action}. Extension may need to be reloaded.`);
        return { 
          success: false, 
          error: 'Extension context invalidated. Please reload the extension or refresh the page.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
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
