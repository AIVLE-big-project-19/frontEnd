import instance from './axiosInstance';

export const checkLoginId = async (loginId) => {
  const { data } = await instance.get('/auth/check-login-id', { params: { value: loginId } });
  return data;
};

export const sendEmailCode = async (email) => {
  const { data } = await instance.post('/auth/email/send-code', { email });
  return data;
};

export const verifyEmailCode = async (email, code) => {
  const { data } = await instance.post('/auth/email/verify-code', { email, code });
  return data;
};

export const signup = async ({ loginId, email, password, name }) => {
  const { data } = await instance.post('/auth/signup', { loginId, email, password, name });
  return data;
};

export const login = async ({ loginId, password, rememberMe }) => {
  const { data } = await instance.post('/auth/login', { loginId, password, rememberMe });
  return data;
};

export const logout = async (refreshToken) => {
  const { data } = await instance.post('/auth/logout', { refreshToken });
  return data;
};

export const sendFindIdCode = async (email) => {
  const { data } = await instance.post('/auth/find-id/send-code', { email });
  return data;
};

export const verifyFindIdCode = async (email, code) => {
  const { data } = await instance.post('/auth/find-id/verify-code', { email, code });
  return data;
};

export const sendFindPasswordCode = async (loginId, email) => {
  const { data } = await instance.post('/auth/password/send-code', { loginId, email });
  return data;
};

export const verifyFindPasswordCode = async (loginId, email, code) => {
  const { data } = await instance.post('/auth/password/verify-code', { loginId, email, code });
  return data;
};

export const getPasswordResetStatus = async (loginId) => {
  const { data } = await instance.get('/auth/password/verification-status', { params: { loginId } });
  return data;
};

export const resetPassword = async (loginId, newPassword) => {
  const { data } = await instance.post('/auth/password/reset', { loginId, newPassword });
  return data;
};
