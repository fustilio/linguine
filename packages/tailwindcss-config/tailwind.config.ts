import type { Config } from 'tailwindcss';

export default {
  darkMode: 'selector',
  theme: {
    extend: {},
  },
  plugins: [],
} as Omit<Config, 'content'>;
