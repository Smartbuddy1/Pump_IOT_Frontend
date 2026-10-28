import axios from 'axios';
import { handleMockRequest } from './mockStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // If using mock token, handle request directly with mock persistence adapter
    if (token && token.startsWith('mock_')) {
      config.adapter = async (cfg) => {
        let url = cfg.url || '';
        const method = (cfg.method || 'get').toLowerCase();
        let body = {};
        try {
          body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : (cfg.data || {});
        } catch (e) {
          body = cfg.data || {};
        }

        // Attach cfg.params to both query string and body
        if (cfg.params && typeof cfg.params === 'object') {
          body = { ...cfg.params, ...body };
          const searchParams = new URLSearchParams();
          Object.entries(cfg.params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              searchParams.append(k, String(v));
            }
          });
          const paramStr = searchParams.toString();
          if (paramStr) {
            url = url.includes('?') ? `${url}&${paramStr}` : `${url}?${paramStr}`;
          }
        }

        const mockRes = handleMockRequest(url, method, body);
        return {
          data: mockRes,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const method = (originalRequest?.method || 'get').toLowerCase();
    const isMutation = ['post', 'put', 'delete', 'patch'].includes(method);

    // If using mock token explicitly
    if (token && token.startsWith('mock_')) {
      let url = originalRequest?.url || '';
      let body = originalRequest?.data || {};
      try {
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
      } catch (e) {}
      if (originalRequest?.params && typeof originalRequest.params === 'object') {
        body = { ...originalRequest.params, ...body };
      }
      const mockRes = handleMockRequest(url, method, body);
      if (mockRes && mockRes.success === false) {
        return Promise.reject({
          response: {
            status: 400,
            data: mockRes
          },
          message: mockRes.message || 'Operation failed'
        });
      }
      return Promise.resolve({ data: mockRes, status: 200 });
    }

    // If backend is down or network fails during a real session, do not silently serve fake mock data
    if (!isMutation && (!error.response || error.code === 'ERR_NETWORK')) {
      console.warn('[API Network Error] Backend server unreachable. Returning network error.');
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.get(`${api.defaults.baseURL}/auth/refresh`, {
          withCredentials: true,
        });
        if (res.data?.success && res.data?.data?.token) {
          const newToken = res.data.data.token;
          sessionStorage.setItem('token', newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        if (token && !token.startsWith('mock_')) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = `${import.meta.env.BASE_URL}login`;
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
