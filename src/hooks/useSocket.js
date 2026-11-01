import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const getSocketConfig = () => {
  let url = 'http://localhost:5000';
  let path = '/socket.io';

  if (typeof window !== 'undefined') {
    url = window.location.origin;
    const isP2t = window.location.pathname.startsWith('/p2t') || 
                  (import.meta.env.VITE_API_BASE_URL || '').includes('p2t-backend') ||
                  (import.meta.env.VITE_SERVER_URL || '').includes('p2t-backend');
    if (isP2t) {
      path = '/p2t-backend/socket.io';
    }
  } else {
    const envUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.startsWith('/')) {
      url = envUrl.replace(/\/api\/v1\/?$/, '');
    }
  }

  return { url, path };
};

const { url: socketUrl, path: socketPath } = getSocketConfig();

export const socket = io(socketUrl, {
  path: socketPath,
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling']
});

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    socket.auth = { token: token || '' };

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      setIsConnected(true);
      // Notify backend to refresh room bindings for this socket connection
      const curToken = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (curToken) { socket.emit('join_tenant', { token: curToken }); }
    };

    const handleDisconnect = () => setIsConnected(false);

    const handleTokenExpired = async () => {
      try {
        const { default: api } = await import('../services/api');
        const res = await api.get('/auth/refresh');
        if (res.data?.success && res.data?.data?.token) {
          const newToken = res.data.data.token;
          sessionStorage.setItem('token', newToken);
          socket.auth = { token: newToken };
          socket.connect();
        }
      } catch (e) {
        // Refresh token expired or revoked
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('token_expired', handleTokenExpired);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('token_expired', handleTokenExpired);
    };
  }, []);

  return { socket, isConnected };
};
