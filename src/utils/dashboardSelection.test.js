import { describe, expect, test } from 'vitest';
import {
  loadDashboardSelections,
  normalizeDashboardSelections,
  saveDashboardSelections,
  STORAGE_KEY,
} from './dashboardSelection';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

describe('dashboard selection', () => {
  test('유휴부지 ML 결과를 통합 대시보드 후보지 형식으로 변환한다', () => {
    const [candidate] = normalizeDashboardSelections([{
      id: 7,
      sourceId: 'LAND-7',
      address: '충청남도 홍성군',
      assetType: 'BUILDING',
      solarReadinessScore: 91.2,
      solarReadinessGrade: 'A',
      candidateRank: 2,
    }]);

    expect(candidate).toMatchObject({
      id: 7,
      siteType: 'ROOF',
      suitabilityScore: 91.2,
      grade: 'A',
      candidateRank: 2,
    });
  });

  test('선택 후보지를 세션 저장소에 보관하고 다시 읽는다', () => {
    const storage = createStorage();

    saveDashboardSelections([{ id: 3, assetType: 'LAND', address: '후보지' }], storage);

    expect(JSON.parse(storage.getItem(STORAGE_KEY))).toHaveLength(1);
    expect(loadDashboardSelections(storage)[0]).toMatchObject({
      id: 3,
      siteType: 'LAND',
      address: '후보지',
    });
  });

  test('손상된 저장값은 빈 목록으로 처리한다', () => {
    const storage = createStorage();
    storage.setItem(STORAGE_KEY, '{not-json');

    expect(loadDashboardSelections(storage)).toEqual([]);
  });

  test('같은 후보지를 누적 저장해도 목록에 한 번만 표시한다', () => {
    const storage = createStorage();

    saveDashboardSelections([
      { id: 3, address: '기존 후보지' },
      { id: 3, address: '갱신 후보지' },
      { id: 4, address: '새 후보지' },
    ], storage);

    expect(loadDashboardSelections(storage)).toHaveLength(2);
    expect(loadDashboardSelections(storage)[0].address).toBe('기존 후보지');
  });
});
