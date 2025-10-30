import { createStorage, StorageEnum } from '../base/index.js';
import type { LanguageStateType, LanguageStorageType } from '../base/index.js';

const storage = createStorage<LanguageStateType>(
  'language-storage-key',
  {
    nativeLanguage: 'en-US',
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const languageStorage: LanguageStorageType = {
  ...storage,
  setNativeLanguage: async (language: string) => {
    await storage.set(currentState => ({
      ...currentState,
      nativeLanguage: language,
    }));
  },
};
