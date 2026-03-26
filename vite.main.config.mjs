import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', '@anthropic-ai/sdk', 'better-sqlite3', /^node:.*/,
        'https', 'http', 'fs', 'path', 'os', 'url', 'crypto', 'stream', 'util', 'events', 'net', 'tls', 'zlib', 'buffer'],
    },
  },
});
