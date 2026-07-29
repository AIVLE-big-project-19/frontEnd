import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import AnalysisReportDashboard from './AnalysisReportDashboard';

test('첨부 보고서의 핵심 옥상 분석 지표를 보여준다', () => {
  render(
    <AnalysisReportDashboard
      analysis={{ suitabilityScore: 98, annualGenerationKwh: 135000, estimatedAnnualRevenue: 24000000, paybackPeriodYears: 6.5 }}
      address="충청남도 홍성군 홍북읍 충남대로 21"
      areaM2={1200}
      capacityKw={100}
      onDownload={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { name: '옥상형 태양광 입지 분석' })).toBeInTheDocument();
  expect(screen.getByText('135,000 kWh')).toBeInTheDocument();
  expect(screen.getByText('2,400 만원')).toBeInTheDocument();
  expect(screen.getByText('850 m²')).toBeInTheDocument();
  expect(screen.getByText(/가용률 82.5%/)).toBeInTheDocument();
  expect(screen.getByText('17.5%')).toBeInTheDocument();
  expect(screen.getByText('2026 신재생에너지 지역지원사업')).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
});
