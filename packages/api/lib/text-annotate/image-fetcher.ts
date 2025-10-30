import { sendBackgroundMessageForArray } from '../message-utils.js';

const inflightMap: Map<string, Promise<string[]>> = new Map();
const cacheMap: Map<string, string[]> = new Map();
const DEBUG_IMAGES = false;

export const getImagesForQuery = async (query: string, max: number = 3): Promise<string[]> => {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  if (cacheMap.has(key)) {
    const cached = cacheMap.get(key)!;
    if (DEBUG_IMAGES) console.log('[ImageFetcher] cache hit:', { key, count: cached.length });
    return cached;
  }
  if (inflightMap.has(key)) {
    if (DEBUG_IMAGES) console.log('[ImageFetcher] inflight hit:', { key });
    return (await inflightMap.get(key)!) ?? [];
  }

  const p = (async () => {
    try {
      if (DEBUG_IMAGES) console.log('[ImageFetcher] requesting:', { key, max });
      const urls = await sendBackgroundMessageForArray<string>('fetchWikimediaImages', { query: key, limit: max });
      const unique = Array.from(new Set(urls.filter(Boolean)));
      if (DEBUG_IMAGES) console.log('[ImageFetcher] received:', { key, count: unique.length });
      cacheMap.set(key, unique);
      return unique;
    } catch {
      if (DEBUG_IMAGES) console.warn('[ImageFetcher] request failed:', { key });
      return [];
    } finally {
      inflightMap.delete(key);
    }
  })();

  inflightMap.set(key, p);
  return await p;
};
