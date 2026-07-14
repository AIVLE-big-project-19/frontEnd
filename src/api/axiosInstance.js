import axios from 'axios';
import {
  getAccessToken, setAccessToken, loadSession, updateRefreshToken, clearSession,
} from '../auth/tokenStorage';

const instance = axios.create({ baseURL: '/api' });

// 401이 와도 토큰 재발급을 시도하면 안 되는 엔드포인트
const NO_REFRESH_URLS = ['/auth/login', '/auth/token/refresh'];

export const attachAuthHeader = (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
    return Promise.reject(error);
  }

  config._retry = true;
  try {
    const { data } = await instance.post('/auth/token/refresh', {
      refreshToken: session.refreshToken,
    });
    setAccessToken(data.data.accessToken);
    updateRefreshToken(data.data.refreshToken);
    config.headers.Authorization = `Bearer ${data.data.accessToken}`;
    return instance.request(config);
  } catch (refreshError) {
    clearSession();
    window.location.href = '/login';
    return Promise.reject(refreshError);
  }
};

instance.interceptors.request.use(attachAuthHeader);
instance.interceptors.response.use((response) => response, handleResponseError);

export default instance;
