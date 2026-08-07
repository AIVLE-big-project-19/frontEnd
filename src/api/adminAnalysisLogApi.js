import instance from './axiosInstance';

export const fetchAdminAnalysisLogs = async () => {
  const { data } = await instance.get('/admin/analysis-logs', { skipErrorModal: true });
  return data.data || [];
};
