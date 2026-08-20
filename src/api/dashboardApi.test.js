import { beforeEach, expect, test, vi } from 'vitest';
import instance from './axiosInstance';
import {
  fetchDashboardCandidateAnalysis,
  fetchDashboardCandidatesByRegion,
} from './dashboardApi';

vi.mock('./axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('선택 후보지의 상세 ML 분석을 조회한다', async () => {
  instance.get.mockResolvedValue({ data: { data: { id: 7, suitabilityScore: 91 } } });

  const result = await fetchDashboardCandidateAnalysis(7);

  expect(instance.get).toHaveBeenCalledWith('/dashboard/candidates/7/analysis', {
    skipErrorModal: true,
  });
  expect(result).toEqual({ id: 7, suitabilityScore: 91 });
});

test('지역 후보지를 페이지 단위로 조회한다', async () => {
  instance.get.mockResolvedValue({
    data: {
      data: {
        content: [{
          id: 7,
          assetType: 'LAND',
          solarReadinessScore: 91,
        }],
        page: 0,
        size: 20,
        totalElements: 27,
        totalPages: 2,
        first: true,
        last: false,
      },
    },
  });

  const result = await fetchDashboardCandidatesByRegion({
    sido: '충청남도',
    sigungu: '홍성군',
    page: 0,
    size: 20,
  });

  expect(instance.get).toHaveBeenCalledWith('/dashboard/candidates/regions', {
    params: {
      sido: '충청남도',
      sigungu: '홍성군',
      page: 0,
      size: 20,
    },
    skipErrorModal: true,
  });
  expect(result.totalElements).toBe(27);
  expect(result.content[0]).toMatchObject({ id: 7, siteType: 'LAND', suitabilityScore: 91 });
});
