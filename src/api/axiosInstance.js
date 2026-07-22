import axios from 'axios';
import {
  getAccessToken, setAccessToken, loadSession, updateRefreshToken, clearSession,
  setAuthExpiredMessage,
} from '../auth/tokenStorage';
import { showErrorToast } from '../notifications/errorToastStore';

const instance = axios.create({ baseURL: '/api' });

// 401이 와도 토큰 재발급을 시도하면 안 되는 엔드포인트
const NO_REFRESH_URLS = ['/auth/login', '/auth/token/refresh'];

// 동시에 여러 요청이 401을 받아도 refresh는 한 번만 수행되도록 공유하는 in-flight promise
let refreshPromise = null;

const refreshAccessToken = (session) => {
  if (!refreshPromise) {
    refreshPromise = instance
      .post('/auth/token/refresh', { refreshToken: session.refreshToken }, { skipErrorModal: true })
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        updateRefreshToken(data.data.refreshToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const attachAuthHeader = (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요.';

const rejectWithToast = (error) => {
  if (!error.config?.skipErrorModal) {
    if (error.response?.data?.success === false) {
      showErrorToast(error.response.data.message);
    } else if (!error.response) {
      showErrorToast(NETWORK_ERROR_MESSAGE);
    }
  }
  return Promise.reject(error);
};

export const handleResponseError = async (error) => {
  const { config, response } = error;
  const status = response?.status;
  const session = loadSession();

  const shouldRefresh =
    status === 401 &&
    config &&
    !config._retry &&
    !NO_REFRESH_URLS.includes(config.url) &&
    session;

  if (!shouldRefresh) {
    return rejectWithToast(error);
  }

  config._retry = true;
  try {
    const accessToken = await refreshAccessToken(session);
    config.headers.Authorization = `Bearer ${accessToken}`;
    return instance.request(config);
  } catch (refreshError) {
    setAuthExpiredMessage();
    clearSession();
    window.location.href = '/login';
    return Promise.reject(refreshError);
  }
};

instance.interceptors.request.use(attachAuthHeader);
instance.interceptors.response.use((response) => response, handleResponseError);

export default instance;
