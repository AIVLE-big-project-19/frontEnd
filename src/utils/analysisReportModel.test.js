import { expect, test } from 'vitest';
import { buildAnalysisReportViewModel } from './analysisReportModel';

test('향후 중첩 API 응답을 대시보드 표시 모델로 변환한다', () => {
  const report = buildAnalysisReportViewModel({
    analysis: {
      id: 42,
      suitabilityScore: 91,
      capacityKw: 120,
      annualGenerationKwh: 160000,
      estimatedAnnualRevenue: 30000000,
      paybackPeriodYears: 7.2,
      generationForecast: {
        source: 'PVGIS 5.3 / ERA5',
        method: 'LOCATION_BASED_PV_SIMULATION',
        fallback: false,
        annualGenerationKwh: 126600,
        tiltDegrees: 30,
        azimuthDegrees: 0,
        systemLossPercent: 14,
        monthly: Array.from({ length: 12 }, (_, index) => ({ generationKwh: 10000 + index * 100 })),
      },
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
  expect(report.analysisStatus).toBe('complete');
  expect(report.decision.label).toBe('설치 권장');
  expect(report.site.usableAreaM2).toBe(910);
  expect(report.scores.map((item) => item.value)).toEqual([90, 92, 94]);
  expect(report.roof.moduleDirection).toBe('남남서향');
  expect(report.risks[0].detail).toBe('용량 협의 필요');
  expect(report.actions[0].title).toBe('현장 방문');
  expect(report.visuals.monthlyGeneration).toHaveLength(12);
  expect(report.visuals.monthlyGeneration[11].value).toBe(11100);
  expect(report.economics.annualGenerationKwh).toBe(126600);
  expect(report.visuals.generationForecast.source).toBe('PVGIS 5.3 / ERA5');
  expect(report.visuals.generationForecast.fallback).toBe(false);
});

test('API 값이 없으면 샘플 수치를 만들지 않고 빈 값으로 유지한다', () => {
  const report = buildAnalysisReportViewModel({});

  expect(report.source).toBe('empty');
  expect(report.economics.roiPercent).toBeNull();
  expect(report.economics.annualRevenue).toBeNull();
  expect(report.visuals.monthlyGeneration.reduce((sum, item) => sum + item.value, 0)).toBe(0);
  expect(report.risks).toEqual([]);
  expect(report.actions).toEqual([]);
});

test('경제성 값이 빠진 분석 결과는 입지 분석으로만 표시한다', () => {
  const report = buildAnalysisReportViewModel({
    analysis: {
      suitabilityScore: 92,
      scores: { ml: 92 },
    },
  });

  expect(report.analysisStatus).toBe('partial');
  expect(report.decision.label).toBe('입지 적합도 우수');
  expect(report.decision.summary).toContain('설치 여부를 확정할 수 없습니다');
  expect(report.economics.hasEstimate).toBe(false);
});
