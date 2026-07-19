import { vi } from 'vitest';
import instance from './axiosInstance';
import { getMyConsents, updateMarketingConsent } from './myPageApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('getMyConsents는 GET /users/me/consents로 consents 배열을 반환한다', async () => {
  const consents = [
    { type: 'TERMS', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
    { type: 'PRIVACY', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
    { type: 'MARKETING', agreed: false, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
  ];
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { consents } },
  });

  const result = await getMyConsents();

  expect(instance.get).toHaveBeenCalledWith('/users/me/consents');
  expect(result).toEqual(consents);
});

test('updateMarketingConsent는 agreed를 PUT하고 변경된 항목을 반환한다', async () => {
  const updated = { type: 'MARKETING', agreed: true, version: '1.0', agreedAt: '2026-07-17T00:00:00' };
  vi.spyOn(instance, 'put').mockResolvedValue({
    data: { success: true, message: '', data: updated },
  });

  const result = await updateMarketingConsent(true);

  expect(instance.put).toHaveBeenCalledWith('/users/me/consents/marketing', { agreed: true });
  expect(result).toEqual(updated);
});
