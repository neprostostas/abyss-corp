import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import react from '@vitejs/plugin-react';

const functionsProxy = {
  '/.netlify/functions': {
    target: 'https://abysscorp.us.ci',
    changeOrigin: true,
    secure: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-3d-scene',
      closeBundle() {
        cpSync(
          'prototype-3d/public/prototype-3d-scene',
          'dist/prototype-3d-scene',
          { recursive: true },
        );
      },
    },
  ],
  optimizeDeps: { entries: ['index.html'] },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', prototype: 'prototype-3d/index.html' },
      output: {
        codeSplitting: {
          groups: [{ name: 'supabase', test: /node_modules\/@supabase\// }],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true, proxy: functionsProxy },
  preview: { port: 4173, strictPort: true, proxy: functionsProxy },
});
