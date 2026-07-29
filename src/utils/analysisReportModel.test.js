import { expect, test } from 'vitest';
import { buildAnalysisReportViewModel } from './analysisReportModel';

test('향후 중첩 API 응답을 대시보드 표시 모델로 변환한다', () => {
  const report = buildAnalysisReportViewModel({
    analysis: {
      id: 42,
      suitabilityScore: 91,
      annualGenerationKwh: 160000,
      estimatedAnnualRevenue: 30000000,
      scores: { ml: 90, vision: 92, regulation: 94 },
      roofAnalysis: { usableAreaM2: 910, shadowRate: 11, moduleDirection: '남남서향' },
      risks: [{ key: 'grid', label: '계통', status: '확인', level: 'check', detail: '용량 협의 필요' }],
      checklist: [{ key: 'visit', title: '현장 방문', detail: '옥상 상태 확인' }],
    },
    address: '테스트 후보지',
    areaM2: 1300,
    capacityKw: 120,
  });

  expect(report.source).toBe('analysis');
  expect(report.site.usableAreaM2).toBe(910);
  expect(report.scores.map((item) => item.value)).toEqual([90, 92, 94]);
  expect(report.roof.moduleDirection).toBe('남남서향');
  expect(report.risks[0].detail).toBe('용량 협의 필요');
  expect(report.actions[0].title).toBe('현장 방문');
});

test('API 값이 없으면 샘플 경제성 지표를 안전하게 사용한다', () => {
  const report = buildAnalysisReportViewModel({});

  expect(report.source).toBe('sample');
  expect(report.economics.roiPercent).toBe(12.4);
  expect(report.economics.annualRevenue).toBe(24000000);
});
