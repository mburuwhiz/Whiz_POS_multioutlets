import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isServe = command === 'serve';
  return {
    plugins: [react()],
    base: isServe ? '/' : './', // Use absolute path for dev and relative for build
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'import.meta.env.VITE_WHIZ_POS_MODE': JSON.stringify(env.WHIZ_POS_MODE || process.env.WHIZ_POS_MODE),
      'import.meta.env.VITE_WHIZ_POS_PORT': JSON.stringify(env.WHIZ_POS_PORT || process.env.WHIZ_POS_PORT),
      'import.meta.env.VITE_WHIZ_POS_DB_NAME': JSON.stringify(env.WHIZ_POS_DB_NAME || process.env.WHIZ_POS_DB_NAME),
    },
    server: {
      port: Number(env.PORT || process.env.PORT) || 5174,
    },
  };
});
