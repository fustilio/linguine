import { createStorage, StorageEnum } from '../base/index.js';
import type { ReadingModeSettingsStateType, ReadingModeSettingsStorageType } from '../base/index.js';

const DEFAULT_SETTINGS: ReadingModeSettingsStateType = {
  fontSizePx: 18,
  lineHeight: 1.6,
  maxWidthCh: 65,
  theme: 'light',
};

const storage = createStorage<ReadingModeSettingsStateType>(
  'text-annotate-reading-mode-settings',
  DEFAULT_SETTINGS,
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

const clampFontSize = (value: number): number => Math.max(12, Math.min(32, value));
const clampLineHeight = (value: number): number => Math.max(1.2, Math.min(2.0, parseFloat(value.toFixed(2))));
const clampMaxWidth = (value: number): number => Math.max(40, Math.min(90, value));

export const readingModeSettingsStorage: ReadingModeSettingsStorageType = {
  ...storage,
  adjustFontSize: async deltaPx => {
    await storage.set(currentState => ({
      ...currentState,
      fontSizePx: clampFontSize(currentState.fontSizePx + deltaPx),
    }));
  },
  adjustLineHeight: async delta => {
    await storage.set(currentState => ({
      ...currentState,
      lineHeight: clampLineHeight(currentState.lineHeight + delta),
    }));
  },
  adjustMaxWidth: async deltaCh => {
    await storage.set(currentState => ({
      ...currentState,
      maxWidthCh: clampMaxWidth(currentState.maxWidthCh + deltaCh),
    }));
  },
  cycleTheme: async () => {
    await storage.set(currentState => {
      const order = ['light', 'dark', 'sepia'] as const;
      const idx = order.indexOf(currentState.theme);
      return {
        ...currentState,
        theme: order[(idx + 1) % order.length],
      };
    });
  },
};

