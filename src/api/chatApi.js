import instance from './axiosInstance';

export const sendChatMessage = async (message) => {
  const { data } = await instance.post('/chat', { message });
  return data;
};

export const sendChatExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await instance.post('/chat/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
