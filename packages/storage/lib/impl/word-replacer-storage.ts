import { createStorage, StorageEnum } from '../base/index.js';
import type { WordReplacerStateType, WordReplacerStorageType } from '../base/index.js';
import { DEFAULT_WORD_REPLACER_STATE } from '../constants/rewriter-defaults.js';

const storage = createStorage<WordReplacerStateType>(
  'wordReplacer',
  DEFAULT_WORD_REPLACER_STATE,
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const wordReplacerStorage: WordReplacerStorageType = {
  ...storage,
  toggleActive: async () => {
    await storage.set(currentState => ({
      ...currentState,
      isActive: !currentState.isActive,
    }));
  },
  updateRewriterOptions: async (options: Partial<WordReplacerStateType['rewriterOptions']>) => {
    await storage.set(currentState => ({
      ...currentState,
      rewriterOptions: {
        ...currentState.rewriterOptions,
        ...options,
      },
    }));
  },
};
