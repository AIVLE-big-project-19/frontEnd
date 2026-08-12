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

// 테스트용: 파일을 직접 고르지 않고, S3에 미리 올려둔 CSV를 그대로 가져와
// 위 uploadIdleLandCsv와 동일한 로직(전량 교체)으로 처리한다.
export const uploadIdleLandCsvFromS3 = async () => {
  const { data } = await instance.post('/admin/idle-lands/upload-from-s3', null, {
    skipErrorModal: true,
  });
  return data.data;
};
