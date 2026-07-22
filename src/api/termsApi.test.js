import { vi } from 'vitest';
import instance from './axiosInstance';
import { getTerms } from './termsApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('getTerms는 type으로 GET 요청해서 data를 반환한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { type: 'TERMS', version: '1.0', content: '# 약관' } },
  });

  const result = await getTerms('TERMS');

  expect(instance.get).toHaveBeenCalledWith('/terms/TERMS', { skipErrorModal: true });
  expect(result).toEqual({ type: 'TERMS', version: '1.0', content: '# 약관' });
});
