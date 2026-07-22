import instance from './axiosInstance';

export const createSiteAnalysis = async (payload) => {
  const { data } = await instance.post('/dashboard/analyses', payload, { skipErrorModal: true });
  return data.data;
};

export const fetchMyAnalysisHistory = async () => {
  const { data } = await instance.get('/dashboard/analyses/me', { skipErrorModal: true });
  return data.data;
};

export const fetchDemoAnalyses = async () => {
  const { data } = await instance.get('/dashboard/analyses/demo', { skipErrorModal: true });
  return data.data;
};
