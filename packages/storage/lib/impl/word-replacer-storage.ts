import { createStorage, StorageEnum } from '../base/index.js';
import { DEFAULT_WORD_REPLACER_STATE } from '../constants/rewriter-defaults.js';
import type { WordReplacerStateType, WordReplacerStorageType } from '../base/index.js';

const storage = createStorage<WordReplacerStateType>('wordReplacer', DEFAULT_WORD_REPLACER_STATE, {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

const mergeRewriterOptions = (
  current: WordReplacerStateType['rewriterOptions'],
  next?: Partial<WordReplacerStateType['rewriterOptions']>,
): WordReplacerStateType['rewriterOptions'] => {
  if (!next) return current;
  return {
    ...current,
    ...next,
  };
};

export const wordReplacerStorage: WordReplacerStorageType & {
  updateState: (partial: Partial<WordReplacerStateType>) => Promise<void>;
} = {
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
      rewriterOptions: mergeRewriterOptions(currentState.rewriterOptions, options),
    }));
  },
  updateWidgetSize: async (size: WordReplacerStateType['widgetSize']) => {
    await storage.set(currentState => ({
      ...currentState,
      widgetSize: size,
    }));
  },
  updateState: async partial => {
    await storage.set(currentState => ({
      ...currentState,
      ...partial,
      rewriterOptions: mergeRewriterOptions(currentState.rewriterOptions, partial.rewriterOptions),
    }));
  },
};
