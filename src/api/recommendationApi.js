import instance from './axiosInstance';

const parseErrorMessage = async (blob) => {
  try {
    const text = await blob.text();
    return JSON.parse(text).message || null;
  } catch {
    return null;
  }
};

const parseFilename = (contentDisposition, fallback) => {
  if (!contentDisposition) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
  return match ? decodeURIComponent(match[1]) : fallback;
};

// AI 서버가 지오코딩→피처수집→비전분석을 순서대로 처리하므로 응답까지 수 분이 걸릴 수 있어 타임아웃을 넉넉히 둔다 (서버 자체 타임아웃 15분)
const REQUEST_TIMEOUT_MS = 15 * 60 * 1000;

export const analyzeVisionCsv = async (file, limit) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await instance.post('/vision-analysis/csv', formData, {
      params: { limit },
      responseType: 'blob',
      timeout: REQUEST_TIMEOUT_MS,
      skipErrorModal: true,
    });
    const filename = parseFilename(response.headers['content-disposition'], 'vision_analysis_result.csv');
    return { blob: response.data, filename };
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      const message = await parseErrorMessage(error.response.data);
      if (message) error.message = message;
    }
    throw error;
  }
};
