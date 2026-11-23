import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { decodeJwt, TOKEN_KEY, USER_KEY } from '../api/client';

const AuthContext = createContext(null);

function readStored() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (!token || !user) return { token: null, user: null };
    const claims = decodeJwt(token);
    if (!claims || claims.exp * 1000 < Date.now()) return { token: null, user: null, expired: true };
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const s = readStored();
    if (s.expired) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return s;
  });

  const logout = useCallback((message) => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null });
    if (message) toast.error(message, { id: 'session' });
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ token: data.access_token, user: data.user });
    // Handy for the demo: show the JWT payload (role, exp) in the console.
    // eslint-disable-next-line no-console
    console.info('[auth] JWT payload', decodeJwt(data.access_token));
    return data.user;
  }, []);

  const updateUser = useCallback((user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState((s) => ({ ...s, user }));
  }, []);

  // Server says the token is invalid/expired → log out with the SRS A1 message.
  useEffect(() => {
    const onExpired = () => logout('Session expired, please log in again');
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [logout]);

  // Client-side timer: log out when the JWT's exp passes even if no request is made.
  useEffect(() => {
    if (!state.token) return undefined;
    const claims = decodeJwt(state.token);
    const ms = claims ? claims.exp * 1000 - Date.now() : 0;
    const t = setTimeout(() => logout('Session expired, please log in again'), Math.max(ms, 0));
    return () => clearTimeout(t);
  }, [state.token, logout]);

  const value = useMemo(() => ({
    token: state.token,
    user: state.user,
    role: state.user?.role,
    isAuthenticated: !!state.token,
    login,
    logout,
    updateUser,
  }), [state, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function homePathFor(role) {
  return role === 'supplier' ? '/supplier-portal' : '/dashboard';
}
