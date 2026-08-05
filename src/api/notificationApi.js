import instance from './axiosInstance';

export const fetchNotifications = async () => {
  const { data } = await instance.get('/notifications', { skipErrorModal: true });
  return data.data;
};

export const markNotificationRead = async (notificationId) => {
  await instance.patch(`/notifications/${notificationId}/read`, null, { skipErrorModal: true });
};

export const markAllNotificationsRead = async () => {
  await instance.patch('/notifications/read-all', null, { skipErrorModal: true });
};

export const deleteNotification = async (notificationId) => {
  await instance.delete(`/notifications/${notificationId}`, { skipErrorModal: true });
};

export const deleteAllNotifications = async () => {
  await instance.delete('/notifications', { skipErrorModal: true });
};
