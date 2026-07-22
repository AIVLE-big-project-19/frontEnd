import instance from './axiosInstance';

export const checkLoginId = async (loginId) => {
  const { data } = await instance.get('/auth/check-login-id', {
    params: { value: loginId }, skipErrorModal: true,
  });
  return data;
};

export const sendEmailCode = async (email) => {
  const { data } = await instance.post('/auth/email/send-code', { email }, { skipErrorModal: true });
  return data;
};

export const verifyEmailCode = async (email, code) => {
  const { data } = await instance.post(
    '/auth/email/verify-code', { email, code }, { skipErrorModal: true }
  );
  return data;
};

export const signup = async ({
  loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed,
}) => {
  const { data } = await instance.post('/auth/signup', {
    loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed,
  }, { skipErrorModal: true });
  return data;
};

export const login = async ({ loginId, password, rememberMe }) => {
  const { data } = await instance.post(
    '/auth/login', { loginId, password, rememberMe }, { skipErrorModal: true }
  );
  return data;
};

export const logout = async (refreshToken) => {
  const { data } = await instance.post('/auth/logout', { refreshToken }, { skipErrorModal: true });
  return data;
};

export const sendFindIdCode = async (email) => {
  const { data } = await instance.post('/auth/find-id/send-code', { email }, { skipErrorModal: true });
  return data;
};

export const verifyFindIdCode = async (email, code) => {
  const { data } = await instance.post(
    '/auth/find-id/verify-code', { email, code }, { skipErrorModal: true }
  );
  return data;
};

export const sendFindPasswordCode = async (loginId, email) => {
  const { data } = await instance.post(
    '/auth/password/send-code', { loginId, email }, { skipErrorModal: true }
  );
  return data;
};

export const verifyFindPasswordCode = async (loginId, email, code) => {
  const { data } = await instance.post(
    '/auth/password/verify-code', { loginId, email, code }, { skipErrorModal: true }
  );
  return data;
};

export const getPasswordResetStatus = async (loginId) => {
  const { data } = await instance.get('/auth/password/verification-status', {
    params: { loginId }, skipErrorModal: true,
  });
  return data;
};

export const resetPassword = async (loginId, newPassword) => {
  const { data } = await instance.post(
    '/auth/password/reset', { loginId, newPassword }, { skipErrorModal: true }
  );
  return data;
};

export const googleLogin = async ({ code, redirectUri }) => {
  const { data } = await instance.post(
    '/auth/google/login', { code, redirectUri }, { skipErrorModal: true }
  );
  return data;
};
