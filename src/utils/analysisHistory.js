const STORAGE_PREFIX = 'solarAivle.analysisHistory';
export const ANALYSIS_HISTORY_STATUSES = [
  { value: 'REVIEWING', label: '검토 중' },
  { value: 'PLANNED', label: '설치 예정' },
  { value: 'ON_HOLD', label: '보류' },
];

const storageKey = (loginId) => `${STORAGE_PREFIX}.${loginId || 'guest'}`;

const toHistoryEntry = (candidate, analysis, previous = {}) => ({
  id: previous.id || `${candidate.id}`,
  candidateId: candidate.id,
  sourceId: candidate.sourceId || null,
  address: candidate.address || analysis?.address || '주소 미상 후보지',
  siteType: candidate.siteType || analysis?.siteType || 'LAND',
  latitude: candidate.latitude ?? analysis?.latitude ?? null,
  longitude: candidate.longitude ?? analysis?.longitude ?? null,
  suitabilityScore: analysis?.suitabilityScore ?? candidate.suitabilityScore ?? null,
  grade: analysis?.grade || candidate.grade || null,
  analysis,
  analyzedAt: new Date().toISOString(),
  favorite: previous.favorite ?? false,
  status: previous.status || 'REVIEWING',
});

export const loadAnalysisHistory = (loginId, storage = window.localStorage) => {
  try {
    const value = JSON.parse(storage.getItem(storageKey(loginId)) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.candidateId != null) : [];
  } catch {
    return [];
  }
};

export const saveAnalysisHistoryEntry = (
  loginId,
  candidate,
  analysis,
  storage = window.localStorage,
) => {
  const current = loadAnalysisHistory(loginId, storage);
  const existing = current.find((item) => String(item.candidateId) === String(candidate.id));
  const nextEntry = toHistoryEntry(candidate, analysis, existing);
  const next = [nextEntry, ...current.filter((item) => String(item.candidateId) !== String(candidate.id))];
  storage.setItem(storageKey(loginId), JSON.stringify(next));
  return next;
};

export const updateAnalysisHistoryEntry = (loginId, candidateId, updates, storage = window.localStorage) => {
  const next = loadAnalysisHistory(loginId, storage).map((item) => (
    String(item.candidateId) === String(candidateId) ? { ...item, ...updates } : item
  ));
  storage.setItem(storageKey(loginId), JSON.stringify(next));
  return next;
};

export const removeAnalysisHistoryEntry = (loginId, candidateId, storage = window.localStorage) => {
  const next = loadAnalysisHistory(loginId, storage)
    .filter((item) => String(item.candidateId) !== String(candidateId));
  storage.setItem(storageKey(loginId), JSON.stringify(next));
  return next;
};

export { STORAGE_PREFIX };
