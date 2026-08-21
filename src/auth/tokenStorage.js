const REFRESH_KEY = 'refreshToken';
const LOGIN_ID_KEY = 'loginId';
const AUTH_EXPIRED_MESSAGE_KEY = 'authExpiredMessage';

const AUTH_EXPIRED_MESSAGE = '로그인이 만료되었습니다. 다시 로그인해주세요.';

let accessToken = null;

export const getAccessToken = () => accessToken;

export const getAccessTokenRole = () => {
  if (!accessToken) return null;

  try {
    const payload = accessToken.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(decoded).role ?? null;
  } catch {
    return null;
  }
};

export const setAccessToken = (token) => {
  accessToken = token;
};

export const saveSession = ({ refreshToken, loginId, rememberMe }) => {
  const target = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  target.setItem(REFRESH_KEY, refreshToken);
  target.setItem(LOGIN_ID_KEY, loginId);
  other.removeItem(REFRESH_KEY);
  other.removeItem(LOGIN_ID_KEY);
};

export const loadSession = () => {
  if (localStorage.getItem(REFRESH_KEY)) {
    return {
      refreshToken: localStorage.getItem(REFRESH_KEY),
      loginId: localStorage.getItem(LOGIN_ID_KEY),
      rememberMe: true,
    };
  }
  if (sessionStorage.getItem(REFRESH_KEY)) {
    return {
      refreshToken: sessionStorage.getItem(REFRESH_KEY),
      loginId: sessionStorage.getItem(LOGIN_ID_KEY),
      rememberMe: false,
    };
  }
  return null;
};

export const updateRefreshToken = (newToken) => {
  if (localStorage.getItem(REFRESH_KEY)) {
    localStorage.setItem(REFRESH_KEY, newToken);
  } else if (sessionStorage.getItem(REFRESH_KEY)) {
    sessionStorage.setItem(REFRESH_KEY, newToken);
  }
};

export const clearSession = () => {
  accessToken = null;
  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem(REFRESH_KEY);
    storage.removeItem(LOGIN_ID_KEY);
  });
};

export const setAuthExpiredMessage = () => {
  sessionStorage.setItem(AUTH_EXPIRED_MESSAGE_KEY, AUTH_EXPIRED_MESSAGE);
};

export const consumeAuthExpiredMessage = () => {
  const message = sessionStorage.getItem(AUTH_EXPIRED_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(AUTH_EXPIRED_MESSAGE_KEY);
  }
  return message;
};
