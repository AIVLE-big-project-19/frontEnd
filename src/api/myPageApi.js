import instance from './axiosInstance';

export const getMyProfile = async () => {
  const { data } = await instance.get('/users/me');
  return data.data;
};

export const updateMyProfile = async (name) => {
  const { data } = await instance.patch('/users/me', { name });
  return data.data;
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  const { data } = await instance.put('/users/me/password', { currentPassword, newPassword });
  return data;
};

export const getMyBoards = async () => {
  const { data } = await instance.get('/users/me/boards');
  return data.data;
};

export const getMyConsents = async () => {
  const { data } = await instance.get('/users/me/consents');
  return data.data.consents;
};

export const updateMarketingConsent = async (agreed) => {
  const { data } = await instance.put('/users/me/consents/marketing', { agreed });
  return data.data;
};

export const withdraw = async (password) => {
  const body = password !== undefined ? { password } : {};
  const { data } = await instance.post('/users/me/withdrawal', body);
  return data;
};
