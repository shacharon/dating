import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
      'capacitor.config.spec.ts',
      'scripts/**/*.spec.ts',
    ],
    setupFiles: ['./src/test/setup-next-dynamic.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
