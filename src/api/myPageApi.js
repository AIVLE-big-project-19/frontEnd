import instance from './axiosInstance';

export const getMyProfile = async (options = {}) => {
  const { data } = await instance.get('/users/me', options);
  return data.data;
};

export const updateMyProfile = async (name) => {
  const { data } = await instance.patch('/users/me', { name }, { skipErrorModal: true });
  return data.data;
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  const { data } = await instance.put(
    '/users/me/password', { currentPassword, newPassword }, { skipErrorModal: true }
  );
  return data;
};

export const getMyBoards = async () => {
  const { data } = await instance.get('/users/me/boards', { skipErrorModal: true });
  return data.data;
};

export const getMyConsents = async () => {
  const { data } = await instance.get('/users/me/consents', { skipErrorModal: true });
  return data.data.consents;
};

export const updateMarketingConsent = async (agreed) => {
  const { data } = await instance.put(
    '/users/me/consents/marketing', { agreed }, { skipErrorModal: true }
  );
  return data.data;
};

export const withdraw = async (password) => {
  const body = password !== undefined ? { password } : {};
  const { data } = await instance.post('/users/me/withdrawal', body, { skipErrorModal: true });
  return data;
};
