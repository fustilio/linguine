// Background messaging utilities (non-database)
import { z } from 'zod';

export interface BackgroundResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const BackgroundResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

export const sendBackgroundMessage = async <T = unknown>(
  action: string,
  data?: unknown,
): Promise<BackgroundResponse<T>> => {
  try {
    const response = (await chrome.runtime.sendMessage({ action, target: 'background', data })) as BackgroundResponse<T>;
    if (response && typeof response.success === 'boolean') {
      return response;
    }
    return { success: false, error: 'Invalid response from background' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const sendBackgroundMessageForArray = async <T = unknown>(action: string, data?: unknown): Promise<T[]> => {
  const res = await sendBackgroundMessage<T[]>(action, data);
  return res.success ? res.data ?? [] : [];
};


