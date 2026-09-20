import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: true },
  server: { host: '127.0.0.1' },
  test: { include: ['tests/**/*.test.ts'], exclude: ['.vendor/**', 'node_modules/**'] },
});
