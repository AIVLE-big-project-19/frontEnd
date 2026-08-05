import instance from './axiosInstance';

export const fetchAnalysisHistory = async () => {
  const { data } = await instance.get('/analysis-history', { skipErrorModal: true });
  return data.data || [];
};

export const updateAnalysisHistoryManagement = async (analysisId, updates) => {
  const { data } = await instance.patch(`/analysis-history/${analysisId}`, updates, { skipErrorModal: true });
  return data.data;
};

export const deleteAnalysisHistory = async (analysisId) => {
  const { data } = await instance.delete(`/analysis-history/${analysisId}`, { skipErrorModal: true });
  return data.data;
};
