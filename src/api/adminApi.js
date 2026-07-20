import instance from './axiosInstance';

export const getAdminUsers = async () => {
  const { data } = await instance.get('/admin/users');
  return data.data;
};

export const changeUserRole = async (userId, role) => {
  const { data } = await instance.patch(`/admin/users/${userId}/role`, { role });
  return data.data;
};
