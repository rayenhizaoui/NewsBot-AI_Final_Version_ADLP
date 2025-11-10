import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './{App,components,pages}/**/*.{ts,tsx}',
    './*.{ts,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
