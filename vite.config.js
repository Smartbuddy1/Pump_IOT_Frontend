import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: env.VITE_BASE_PATH || '/p2t/',
    plugins: [react()],
  server: {
    port: 5175,
    host: '0.0.0.0', // Listen on all local IPv4 IPs
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': {
        target: env.VITE_SERVER_URL || 'http://13.232.110.133',
        changeOrigin: true,
      },
      '/uploads': {
        target: env.VITE_SERVER_URL || 'http://13.232.110.133',
        changeOrigin: true,
      },
      '/socket.io': {
        target: env.VITE_SERVER_URL || 'http://13.232.110.133',
        ws: true,
      },
      '/s3-proxy': {
        target: 'https://smartbuddyiot.s3.ap-south-1.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/s3-proxy/, '')
      }
    }
  }
  };
});
