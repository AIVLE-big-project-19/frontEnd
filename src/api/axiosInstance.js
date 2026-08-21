import axios from 'axios';
import {
  getAccessToken, setAccessToken, loadSession, updateRefreshToken, clearSession,
  setAuthExpiredMessage,
} from '../auth/tokenStorage';
import { showErrorToast } from '../notifications/errorToastStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const instance = axios.create({ baseURL: API_BASE_URL });

const NO_REFRESH_URLS = ['/auth/login', '/auth/token/refresh'];

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
