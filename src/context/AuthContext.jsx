import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { socket, disconnectSocket } from '../hooks/useSocket';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any legacy persistent localStorage auth so project restart/run always opens login
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {}

    // Restore session only from sessionStorage
    const token = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (token && storedUser) {
      if (token.startsWith('mock_')) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser) {
          setUser(parsedUser);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const cleanUser = String(username || '').trim();
      const cleanPass = String(password || '').trim();

      if (!cleanUser || !cleanPass) {
        return { success: false, message: 'Please enter both mobile number and password' };
      }

      // Use the real backend API for all logins (Super Admin, OMC Admin, RO Manager)
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const response = await axios.post(`${apiUrl}/auth/login`, {
        username: cleanUser,
        mobile: cleanUser,
        password: cleanPass
      });

      const resData = response.data?.data || response.data;
      const token = resData?.token;
      const userData = resData?.user || resData;

      if (token && userData) {
        // Normalize field names (backend may return omc_id / ro_id in snake_case)
        const normalizedUser = {
          id: userData.id,
          name: userData.name || userData.username || cleanUser,
          mobile: userData.mobile || userData.username || cleanUser,
          username: userData.username || cleanUser,
          role: userData.role || 'User',
          omcId: userData.omcId ?? userData.omc_id ?? null,
          roId: userData.roId ?? userData.ro_id ?? null,
        };
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(normalizedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Re-authenticate socket with new token
        try {
          socket.auth = { token };
          if (socket.connected) {
            socket.disconnect().connect();
          } else {
            socket.connect();
          }
        } catch (e) {}

        setUser(normalizedUser);
        return { success: true, role: normalizedUser.role };
      }

      return {
        success: false,
        message: response.data?.message || 'Login failed'
      };
    } catch (error) {
      const isNetError = error.code === 'ERR_NETWORK' || !error.response;
      return {
        success: false,
        message: error.response?.data?.message || (isNetError ? 'Unable to connect to backend server. Please check if the server is running.' : 'Invalid mobile number or password')
      };
    }
  };

  const logout = () => {
    disconnectSocket();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

