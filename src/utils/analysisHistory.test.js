import { describe, expect, test } from 'vitest';
import {
  loadAnalysisHistory,
  removeAnalysisHistoryEntry,
  saveAnalysisHistoryEntry,
  updateAnalysisHistoryEntry,
} from './analysisHistory';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

describe('analysis history', () => {
  test('분석 완료 후보지를 저장하고 같은 후보지 재분석 시 갱신한다', () => {
    const storage = createStorage();
    const candidate = { id: 7, address: '경기도 수원시', siteType: 'LAND', suitabilityScore: 82 };

    saveAnalysisHistoryEntry('tester', candidate, { suitabilityScore: 82 }, storage);
    saveAnalysisHistoryEntry('tester', candidate, { suitabilityScore: 91 }, storage);

    expect(loadAnalysisHistory('tester', storage)).toHaveLength(1);
    expect(loadAnalysisHistory('tester', storage)[0].suitabilityScore).toBe(91);
  });

  test('즐겨찾기·상태를 변경하고 이력을 삭제한다', () => {
    const storage = createStorage();
    saveAnalysisHistoryEntry('tester', { id: 3, address: '후보지' }, {}, storage);
    updateAnalysisHistoryEntry('tester', 3, { favorite: true, status: 'PLANNED' }, storage);

    expect(loadAnalysisHistory('tester', storage)[0]).toMatchObject({ favorite: true, status: 'PLANNED' });

    removeAnalysisHistoryEntry('tester', 3, storage);
    expect(loadAnalysisHistory('tester', storage)).toEqual([]);
  });
});
