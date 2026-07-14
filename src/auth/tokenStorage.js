const REFRESH_KEY = 'refreshToken';
const LOGIN_ID_KEY = 'loginId';

let accessToken = null;

export const getAccessToken = () => accessToken;

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
