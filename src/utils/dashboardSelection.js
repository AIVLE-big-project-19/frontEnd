const STORAGE_KEY = 'solarAivle.dashboardCandidates';

export const toDashboardSelection = (item) => ({
  id: item.id,
  sourceId: item.sourceId,
  address: item.address,
  siteType: item.siteType || (item.assetType === 'BUILDING' ? 'ROOF' : 'LAND'),
  latitude: item.latitude,
  longitude: item.longitude,
  suitabilityScore: item.suitabilityScore ?? item.solarReadinessScore,
  grade: item.grade ?? item.solarReadinessGrade,
  candidateRank: item.candidateRank,
});

export const normalizeDashboardSelections = (items) => {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  return items
    .filter((item) => item?.id != null)
    .map(toDashboardSelection)
    .filter((item) => {
      const key = String(item.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const saveDashboardSelections = (items, storage = window.sessionStorage) => {
  const candidates = normalizeDashboardSelections(items);
  storage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  return candidates;
};

export const loadDashboardSelections = (storage = window.sessionStorage) => {
  try {
    return normalizeDashboardSelections(JSON.parse(storage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
};

export { STORAGE_KEY };
