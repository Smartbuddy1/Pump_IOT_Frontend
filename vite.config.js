import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const backendTarget = env.VITE_SERVER_URL || 'http://13.232.110.133';

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
          target: backendTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', 'http://13.232.110.133');
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              if (req.headers.origin) {
                proxyRes.headers['access-control-allow-origin'] = req.headers.origin;
                proxyRes.headers['access-control-allow-credentials'] = 'true';
              }
            });
          },
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', 'http://13.232.110.133');
            });
          },
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', 'http://13.232.110.133');
            });
            proxy.on('proxyReqWs', (proxyReq) => {
              proxyReq.setHeader('origin', 'http://13.232.110.133');
            });
          },
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
