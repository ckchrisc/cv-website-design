import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: '/cv-website-design/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // 1. 如果環境變數停用 HMR，直接明確設為 false，避免 WebSocket 嘗試連線
      hmr: process.env.DISABLE_HMR === 'true' ? false : {
        protocol: 'wss',
        clientPort: 443
      },
      // 2. 配合平台設定調整檔案監聽
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // 3. 確保雲端環境下能正常對外監聽 Port
      host: '0.0.0.0',
    },
  };
});
