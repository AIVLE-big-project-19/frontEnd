import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import instance from '../api/axiosInstance';
import * as authApi from '../api/authApi';
import { useRunOnce } from '../hooks/useRunOnce';
import {
  setAccessToken, saveSession, loadSession, updateRefreshToken, clearSession,
  setAuthExpiredMessage, getAccessTokenRole,
} from '../auth/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loginId, setLoginId] = useState(null);
  const [role, setRole] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasRestored = useRunOnce();

  useEffect(() => {
    if (hasRestored()) {
      return;
    }

    const restore = async () => {
      const session = loadSession();
      if (!session) {
        setIsInitializing(false);
        return;
      }
      try {
        const { data } = await instance.post('/auth/token/refresh', {
          refreshToken: session.refreshToken,
        }, { skipErrorModal: true });
        setAccessToken(data.data.accessToken);
        setRole(getAccessTokenRole());
        updateRefreshToken(data.data.refreshToken);
        setLoginId(session.loginId);
      } catch {
        setAuthExpiredMessage();
        clearSession();
      } finally {
        setIsInitializing(false);
      }
    };
    restore();
  }, [hasRestored]);

  const login = useCallback((tokens, newLoginId, rememberMe) => {
    setAccessToken(tokens.accessToken);
    setRole(getAccessTokenRole());
    saveSession({ refreshToken: tokens.refreshToken, loginId: newLoginId, rememberMe });
    setLoginId(newLoginId);
  }, []);

  const logout = useCallback(async () => {
    const session = loadSession();
    if (session) {
      await authApi.logout(session.refreshToken).catch(() => {});
    }
    clearSession();
    setLoginId(null);
    setRole(null);
  }, []);

  const clearLocalSession = useCallback(() => {
    clearSession();
    setLoginId(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn: loginId !== null, loginId, role, isAdmin: role === 'ADMIN', isInitializing,
      login, logout, clearLocalSession,
    }),
    [loginId, role, isInitializing, login, logout, clearLocalSession],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return context;
};
