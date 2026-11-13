import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  optimizeDeps: { entries: ['prototype-3d/index.html'] },
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    rolldownOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
    },
  },
});
