import globalConfig from '@extension/tailwindcss-config';
import deepmerge from 'deepmerge';
import type { Config } from 'tailwindcss';

export const withUI = (tailwindConfig: Config): Config => {
  const merged = deepmerge(tailwindConfig, {
    content: ['../../packages/ui/lib/**/*.tsx'],
  });

  // Ensure the global config preset is included for darkMode: 'selector'
  return {
    ...merged,
    presets: [globalConfig, ...(merged.presets || [])],
  } as Config;
};
