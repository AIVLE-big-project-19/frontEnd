import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import instance from '../api/axiosInstance';
import * as authApi from '../api/authApi';
import {
  setAccessToken, saveSession, loadSession, updateRefreshToken, clearSession,
  setAuthExpiredMessage, getAccessTokenRole,
} from '../auth/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loginId, setLoginId] = useState(null);
  const [role, setRole] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasRestored = useRef(false);

  useEffect(() => {
    // StrictMode는 개발 모드에서 mount effect를 두 번 실행한다. refreshToken이 1회용이면
    // 두 번째 호출이 이미 소모된 토큰으로 실패해 정상 로그인 상태를 덮어써버리므로, 최초 1회만 실행되게 막는다.
    if (hasRestored.current) {
      return;
    }
    hasRestored.current = true;

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
  }, []);

  const login = useCallback((tokens, newLoginId, rememberMe) => {
    setAccessToken(tokens.accessToken);
    setRole(getAccessTokenRole());
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
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ isLoggedIn: loginId !== null, loginId, role, isAdmin: role === 'ADMIN', isInitializing, login, logout }),
    [loginId, role, isInitializing, login, logout],
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
