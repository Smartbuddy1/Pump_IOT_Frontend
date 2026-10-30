import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return window.location.origin;
  }
  const envUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || envUrl.startsWith('/')) {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
  }
  return envUrl.replace('/api/v1', '');
};

export const socket = io(getSocketUrl(), {
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
      socket.emit('join_tenant', { token: curToken });
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

