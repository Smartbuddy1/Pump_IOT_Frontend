import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || envUrl.startsWith('/')) {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
  }
  return envUrl.replace('/api/v1', '');
};

const socket = io(getSocketUrl(), {
  autoConnect: false, // Wait until we explicitly call connect()
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      setIsConnected(true);
      try {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          socket.emit('join_tenant', {
            role: u.role,
            omcId: u.omc_id || u.omcId,
            roId: u.ro_id || u.roId
          });
        }
      } catch (e) {
        // ignore parse error
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect');
    };
  }, []);

  return { socket, isConnected };
};
