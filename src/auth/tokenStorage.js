const REFRESH_KEY = 'refreshToken';
const LOGIN_ID_KEY = 'loginId';
const AUTH_EXPIRED_MESSAGE_KEY = 'authExpiredMessage';

export const AUTH_EXPIRED_MESSAGE = '로그인이 만료되었습니다. 다시 로그인해주세요.';

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

// refresh token이 만료/무효화되어 로그인 페이지로 튕겨나갈 때, 하드 네비게이션(window.location.href)이나
// 앱 부팅 시점처럼 react-router의 location.state를 전달할 수 없는 경로에서도 "세션 만료" 안내를
// 보여줄 수 있도록 sessionStorage에 1회성 메시지를 남겨둔다.
export const setAuthExpiredMessage = () => {
  sessionStorage.setItem(AUTH_EXPIRED_MESSAGE_KEY, AUTH_EXPIRED_MESSAGE);
};

// 메시지를 읽고 즉시 제거해 다음 방문 시 다시 나타나지 않도록 한다.
export const consumeAuthExpiredMessage = () => {
  const message = sessionStorage.getItem(AUTH_EXPIRED_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(AUTH_EXPIRED_MESSAGE_KEY);
  }
  return message;
};
