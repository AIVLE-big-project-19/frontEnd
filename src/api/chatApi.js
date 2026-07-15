import instance from './axiosInstance';

export const sendChatMessage = async (message) => {
  const { data } = await instance.post('/chat', { message });
  return data;
};
