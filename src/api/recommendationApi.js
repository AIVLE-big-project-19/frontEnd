import instance from './axiosInstance';

export const uploadRecommendation = async (file, limit) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await instance.post('/recommendations', formData, {
    params: { limit },
    skipErrorModal: true,
  });
  return data.data;
};

export const fetchRecommendation = async (id) => {
  const { data } = await instance.get(`/recommendations/${id}`, {
    skipErrorModal: true,
  });
  return data.data;
};

export const fetchMyRecommendations = async () => {
  const { data } = await instance.get('/recommendations/me', {
    skipErrorModal: true,
  });
  return data.data;
};

export const deleteRecommendation = async (id) => {
  await instance.delete(`/recommendations/${id}`, {
    skipErrorModal: true,
  });
};
