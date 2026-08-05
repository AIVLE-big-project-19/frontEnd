import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import DashboardPage from './DashboardPage';

const { fetchAnalysisMock } = vi.hoisted(() => ({
  fetchAnalysisMock: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ loginId: null }),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('../components/MapView', () => ({
  default: ({ selectedCoordinates }) => (
    <div data-testid="dashboard-map-selection">
      {selectedCoordinates ? selectedCoordinates.join(',') : 'no-selection'}
    </div>
  ),
}));

vi.mock('../components/AnalysisReportDashboard', () => ({
  default: ({ report }) => <div data-testid="analysis-report">{report.site.address}</div>,
}));

vi.mock('../api/dashboardApi', () => ({
  fetchDashboardCandidateAnalysis: fetchAnalysisMock,
  fetchDashboardCandidatesByRegion: vi.fn(),
  downloadDashboardCandidateReport: vi.fn(),
}));

vi.mock('../utils/analysisHistory', () => ({
  saveAnalysisHistoryEntry: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ apiKey: 'test-key' }),
  });
  fetchAnalysisMock.mockResolvedValue({
    address: '충청남도 테스트 후보지',
    capacityKw: 100,
    annualGenerationKwh: 130000,
    estimatedAnnualRevenue: 20800000,
    paybackPeriodYears: 6,
  });
});

test('후보 클릭은 지도만 이동하고 분석 버튼을 눌렀을 때 상세 분석을 실행한다', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[{
      pathname: '/dashboard',
      state: {
        selectedCandidates: [
          {
            id: 7,
            sourceId: 'SOLAR-7',
            address: '충청남도 테스트 후보지',
            siteType: 'LAND',
            latitude: 36.5,
            longitude: 127.2,
            suitabilityScore: 90,
            grade: 'A',
          },
          {
            id: 8,
            sourceId: 'SOLAR-8',
            address: '충청남도 두 번째 후보지',
            siteType: 'LAND',
            latitude: 36.7,
            longitude: 127.4,
            suitabilityScore: 85,
            grade: 'A',
          },
        ],
      },
    }]}
    >
      <DashboardPage />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: /충청남도 테스트 후보지/ }));

  expect(fetchAnalysisMock).not.toHaveBeenCalled();
  expect(screen.getByTestId('dashboard-map-selection')).not.toHaveTextContent('no-selection');
  expect(screen.getByRole('button', { name: 'AI 분석 실행' })).toBeEnabled();

  await user.click(screen.getByRole('button', { name: 'AI 분석 실행' }));

  await waitFor(() => expect(fetchAnalysisMock).toHaveBeenCalledWith(7));

  expect(screen.getByTestId('analysis-report')).toHaveTextContent('충청남도 테스트 후보지');
  await user.click(screen.getByRole('button', { name: /충청남도 두 번째 후보지/ }));

  expect(fetchAnalysisMock).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('analysis-report')).toHaveTextContent('충청남도 테스트 후보지');
  expect(screen.getByRole('button', { name: 'AI 분석 실행' })).toBeEnabled();
});
