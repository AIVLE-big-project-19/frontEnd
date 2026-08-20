import instance from './axiosInstance';

const toDashboardCandidate = (item) => ({
  id: item.id,
  sourceId: item.sourceId,
  address: item.address,
  siteType: item.assetType === 'BUILDING' ? 'ROOF' : 'LAND',
  latitude: item.latitude,
  longitude: item.longitude,
  suitabilityScore: item.solarReadinessScore,
  grade: item.solarReadinessGrade,
  candidateRank: item.candidateRank,
});

export const fetchDashboardCandidatesByRegion = async ({
  sido,
  sigungu,
  page = 0,
  size = 20,
}) => {
  const { data } = await instance.get('/dashboard/candidates/regions', {
    params: { sido, sigungu, page, size },
    skipErrorModal: true,
  });
  return {
    ...data.data,
    content: (data.data?.content || []).map(toDashboardCandidate),
  };
};

export const fetchDashboardCandidateAnalysis = async (idleLandId) => {
  const { data } = await instance.get(`/dashboard/candidates/${idleLandId}/analysis`, {
    skipErrorModal: true,
  });
  return data.data;
};

export const downloadDashboardCandidateReport = async (idleLandId) => {
  const { data } = await instance.post(
    `/pdf/generate/idle-land/${idleLandId}`,
    null,
    { responseType: 'blob', skipErrorModal: true },
  );
  return data;
};

export const downloadAnalysisSnapshotReport = async (analysisId) => {
  const { data } = await instance.post(
    `/pdf/generate/analysis/${analysisId}`,
    null,
    { responseType: 'blob', skipErrorModal: true },
  );
  return data;
};
