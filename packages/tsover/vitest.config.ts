import { defineConfig } from 'vitest/config';
import tsover from 'tsover/plugin/vite';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  plugins: [tsover()],
});
