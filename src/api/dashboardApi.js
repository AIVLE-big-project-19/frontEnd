import instance from './axiosInstance';

export const createSiteAnalysis = async (payload) => {
  const { data } = await instance.post('/dashboard/analyses', payload);
  return data.data;
};

export const fetchMyAnalysisHistory = async () => {
  const { data } = await instance.get('/dashboard/analyses/me');
  return data.data;
};
