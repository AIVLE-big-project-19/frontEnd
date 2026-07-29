import instance from './axiosInstance';

export const searchIdleLands = async (query) => {
  const { data } = await instance.get('/idle-lands/search', {
    params: { q: query },
    skipErrorModal: true,
  });
  return data.data;
};

export const downloadIdleLandReport = async (idleLandId) => {
  const { data } = await instance.post(
    `/pdf/generate/idle-land/${idleLandId}`,
    null,
    { responseType: 'blob', skipErrorModal: true },
  );
  return data;
};

export const uploadIdleLandCsv = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await instance.post('/admin/idle-lands/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    skipErrorModal: true,
  });
  return data.data;
};
