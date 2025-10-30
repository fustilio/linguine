import { z } from 'zod';

// Zod schema for Wikimedia API response
const WikimediaImageInfoSchema = z.object({
  url: z.string(),
  descriptionurl: z.string().optional(),
  descriptionshorturl: z.string().optional(),
});

const WikimediaPageSchema = z.object({
  pageid: z.number(),
  ns: z.number(),
  title: z.string(),
  imagerepository: z.string(),
  imageinfo: z.array(WikimediaImageInfoSchema).optional(),
});

const WikimediaQuerySchema = z.object({
  pages: z.record(z.string(), WikimediaPageSchema),
});

const WikimediaContinueSchema = z.object({
  continue: z.string().optional(),
  gimcontinue: z.string().optional(),
});

const WikimediaAPIResponseSchema = z.object({
  batchcomplete: z.string().optional(),
  continue: WikimediaContinueSchema.optional(),
  query: WikimediaQuerySchema,
});

// Type inference from the schema
export type WikimediaAPIResponse = z.infer<typeof WikimediaAPIResponseSchema>;
export type WikimediaPage = z.infer<typeof WikimediaPageSchema>;
export type WikimediaImageInfo = z.infer<typeof WikimediaImageInfoSchema>;

// Export schemas for external validation if needed
export { WikimediaAPIResponseSchema, WikimediaPageSchema, WikimediaImageInfoSchema };

/**
 * Query the Wikimedia Commons API for images related to a search term
 * @param params - Query parameters including search term and limit
 * @returns Promise resolving to validated Wikimedia API response
 */
export const queryWikimediaAPI = async (params: { query: string; limit: number }): Promise<WikimediaAPIResponse> => {
  console.log('Querying Wikimedia API...');

  const res = await fetch(
    // Use generator=search to find File: pages directly by keyword
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
      `&generator=search&gsrsearch=${encodeURIComponent(params.query)}` +
      `&gsrlimit=${params.limit}&gsrnamespace=6` + // namespace 6 = File
      `&prop=imageinfo&iiprop=url`,
  );

  if (!res.ok) {
    throw new Error(`Wikimedia API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Validate the response using Zod schema; fallback to empty structure if missing pages
  const parsed = WikimediaAPIResponseSchema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }
  console.error('Wikimedia API response validation failed:', parsed.error);
  console.error('Raw response:', data);
  // Fallback: return empty pages so callers can continue gracefully
  const fallback: WikimediaAPIResponse = {
    batchcomplete: typeof data?.batchcomplete === 'string' ? data.batchcomplete : undefined,
    query: { pages: {} },
  } as WikimediaAPIResponse;
  return fallback;
};

/**
 * Test function for Wikimedia API functionality
 * @param query - Search term to test with (defaults to 'dog')
 * @param limit - Number of results to fetch (defaults to 5)
 */
export const testWikimediaFetch = async (query: string = 'dog', limit: number = 5): Promise<void> => {
  console.log('Testing fetch from Wikimedia...');

  try {
    const res = await queryWikimediaAPI({ query, limit });
    console.log('Wikimedia API response:', res);
  } catch (error) {
    console.error('Wikimedia API test failed:', error);
  }
};

/**
 * Extract image URLs from a Wikimedia API response
 * @param response - The validated Wikimedia API response
 * @returns Array of image URLs
 */
export const extractImageUrls = (response: WikimediaAPIResponse): string[] => {
  const urls: string[] = [];

  if (response.query?.pages) {
    Object.values(response.query.pages).forEach(page => {
      if (page.imageinfo && page.imageinfo.length > 0) {
        page.imageinfo.forEach(info => {
          if (info.url) {
            urls.push(info.url);
          }
        });
      }
    });
  }

  return urls;
};

/**
 * Get page titles from a Wikimedia API response
 * @param response - The validated Wikimedia API response
 * @returns Array of page titles
 */
export const extractPageTitles = (response: WikimediaAPIResponse): string[] => {
  const titles: string[] = [];

  if (response.query?.pages) {
    Object.values(response.query.pages).forEach(page => {
      if (page.title) {
        titles.push(page.title);
      }
    });
  }

  return titles;
};
