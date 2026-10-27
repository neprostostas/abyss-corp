import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const functionsProxy = {
  '/.netlify/functions': {
    target: 'https://abysscorp.us.ci',
    changeOrigin: true,
    secure: true,
  },
};

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
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
