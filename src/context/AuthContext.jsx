import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import instance from '../api/axiosInstance';
import * as authApi from '../api/authApi';
import {
  setAccessToken, saveSession, loadSession, updateRefreshToken, clearSession,
} from '../auth/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loginId, setLoginId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const session = loadSession();
      if (!session) {
        setIsInitializing(false);
        return;
      }
      try {
        const { data } = await instance.post('/auth/token/refresh', {
          refreshToken: session.refreshToken,
        });
        setAccessToken(data.data.accessToken);
        updateRefreshToken(data.data.refreshToken);
        setLoginId(session.loginId);
      } catch {
        clearSession();
      } finally {
        setIsInitializing(false);
      }
    };
    restore();
  }, []);

  const login = useCallback((tokens, newLoginId, rememberMe) => {
    setAccessToken(tokens.accessToken);
    saveSession({ refreshToken: tokens.refreshToken, loginId: newLoginId, rememberMe });
    setLoginId(newLoginId);
  }, []);

  const logout = useCallback(async () => {
    const session = loadSession();
    if (session) {
      try {
        await authApi.logout(session.refreshToken);
      } catch {
        // 서버 로그아웃 실패해도 로컬 세션은 정리한다
      }
    }
    clearSession();
    setLoginId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: loginId !== null, loginId, isInitializing, login, logout }}
    >
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
