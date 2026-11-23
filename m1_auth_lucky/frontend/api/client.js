import axios from 'axios';

/**
 * Shared axios instance. Requests go to /api/... and the Vite dev proxy forwards them to
 * Flask on :5050 (no CORS during the demo). Adds the Bearer token; on 401 for an
 * authenticated request it fires `auth:expired` so AuthContext logs out with a toast.
 */
export const TOKEN_KEY = 'dsc_token';
export const USER_KEY = 'dsc_user';

const api = axios.create({ baseURL: '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const hadToken = !!error.config?.headers?.Authorization;
    const isLogin = error.config?.url?.includes('/auth/login');
    if (status === 401 && hadToken && !isLogin) {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: error.response?.data?.error?.code }));
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong') {
  if (!error?.response) return 'Cannot reach the server. Is the backend running on port 5050?';
  return error.response.data?.error?.message || fallback;
}

export function getFieldErrors(error) {
  return error?.response?.data?.error?.details || {};
}

export function getErrorCode(error) {
  return error?.response?.data?.error?.code;
}

/** Decode a JWT payload (display only, no verification). */
export function decodeJwt(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(window.atob(part))));
  } catch {
    return null;
  }
}

export default api;
