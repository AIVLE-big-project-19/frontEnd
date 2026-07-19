import instance from './axiosInstance';

export const getTerms = async (type) => {
  const { data } = await instance.get(`/terms/${type}`);
  return data.data;
};
