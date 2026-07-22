import instance from './axiosInstance';

export const getAdminUsers = async () => {
  const { data } = await instance.get('/admin/users', { skipErrorModal: true });
  return data.data;
};

export const changeUserRole = async (userId, role) => {
  const { data } = await instance.patch(`/admin/users/${userId}/role`, { role }, { skipErrorModal: true });
  return data.data;
};
