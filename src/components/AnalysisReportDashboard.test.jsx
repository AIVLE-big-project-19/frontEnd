import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import AnalysisReportDashboard from './AnalysisReportDashboard';
import { buildAnalysisReportViewModel } from '../utils/analysisReportModel';

test('의사결정에 필요한 핵심 지표와 다음 행동을 보여준다', () => {
  const report = buildAnalysisReportViewModel({
    analysis: {
      siteType: 'ROOF',
      suitabilityScore: 98,
      capacityKw: 100,
      annualGenerationKwh: 135000,
      estimatedAnnualRevenue: 24000000,
      paybackPeriodYears: 6.5,
      generationForecast: {
        source: 'PVGIS 5.3 / ERA5',
        method: 'LOCATION_BASED_PV_SIMULATION',
        fallback: false,
        annualGenerationKwh: 135000,
        tiltDegrees: 30,
        azimuthDegrees: 0,
        systemLossPercent: 14,
        monthly: Array.from({ length: 12 }, () => ({ generationKwh: 11250 })),
      },
    },
    address: '충청남도 홍성군 홍북읍 충남대로 21',
    areaM2: 1200,
    capacityKw: 100,
  });

  render(<AnalysisReportDashboard report={report} onDownload={vi.fn()} />);

  expect(screen.getByRole('heading', { name: '설치 권장' })).toBeInTheDocument();
  expect(screen.getByText('135,000 kWh')).toBeInTheDocument();
  expect(screen.getByText('0.2 억')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '1월부터 12월까지 월별 예상 발전량 막대 그래프' })).toBeInTheDocument();
  expect(screen.getAllByText('AI 추정 가용 면적')).toHaveLength(2);
  expect(screen.getAllByText('면적 기반 개략 용량')).toHaveLength(2);
  expect(screen.getByRole('heading', { name: '단순 예상 회수 시점' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '기본 가정 기준 연간 예상 매출 산정 기준과 출처 보기' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '위치 기반 예상 발전량 산정 기준과 출처 보기' })).toBeInTheDocument();
  expect(screen.getByText('PVGIS 5.3 / ERA5·경사 30°·손실 14%')).toBeInTheDocument();
  expect(screen.getByText('구조안전진단')).toBeInTheDocument();
  expect(screen.getByText('상세 기술 지표 보기')).toBeInTheDocument();
});

test('경제성 값이 없으면 확정적인 설치 및 회수 표현을 숨긴다', () => {
  const report = buildAnalysisReportViewModel({
    analysis: {
      siteType: 'LAND',
      suitabilityScore: 92,
      scores: { ml: 92 },
    },
    address: '충청남도 천안시 테스트 후보지',
  });

  render(<AnalysisReportDashboard report={report} onDownload={vi.fn()} />);

  expect(screen.getByRole('heading', { name: '입지 적합도 우수' })).toBeInTheDocument();
  expect(screen.getByText('경제성 지표 미산정')).toBeInTheDocument();
  expect(screen.getByText('발전량 산정에 필요한 데이터가 없습니다.')).toBeInTheDocument();
  expect(screen.queryByText('고정 단가와 초기 설치비만 반영한 개략값입니다. 실제 투자 판단에는 운영비와 금융조건 확인이 필요합니다.')).not.toBeInTheDocument();
});
