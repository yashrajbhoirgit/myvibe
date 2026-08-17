import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api-deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-deezer/, ''),
        secure: false,
      },
      '/api-saavn': {
        target: 'https://saavn.dev/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-saavn/, ''),
        secure: false,
      },
      '/api-invidious': {
        target: 'https://inv.nadeko.net/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-invidious/, ''),
        secure: false,
      }
    }
  }
});
