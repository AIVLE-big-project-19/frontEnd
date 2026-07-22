import { vi } from 'vitest';
import instance from './axiosInstance';
import { getMyConsents, getMyProfile, updateMarketingConsent, withdraw } from './myPageApi';

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

  expect(instance.get).toHaveBeenCalledWith('/users/me/consents', { skipErrorModal: true });
  expect(result).toEqual(consents);
});

test('updateMarketingConsent는 agreed를 PUT하고 변경된 항목을 반환한다', async () => {
  const updated = { type: 'MARKETING', agreed: true, version: '1.0', agreedAt: '2026-07-17T00:00:00' };
  vi.spyOn(instance, 'put').mockResolvedValue({
    data: { success: true, message: '', data: updated },
  });

  const result = await updateMarketingConsent(true);

  expect(instance.put).toHaveBeenCalledWith(
    '/users/me/consents/marketing', { agreed: true }, { skipErrorModal: true }
  );
  expect(result).toEqual(updated);
});

test('withdraw는 password를 전달하면 body에 담아 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue({ data: { success: true, message: '', data: null } });

  await withdraw('currentPassword1!');

  expect(instance.post).toHaveBeenCalledWith(
    '/users/me/withdrawal', { password: 'currentPassword1!' }, { skipErrorModal: true }
  );
});

test('withdraw는 인자 없이 호출하면(구글 계정) 빈 body로 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue({ data: { success: true, message: '', data: null } });

  await withdraw();

  expect(instance.post).toHaveBeenCalledWith('/users/me/withdrawal', {}, { skipErrorModal: true });
});

test('getMyProfile은 전달받은 options를 그대로 axios config로 전달한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { loginId: 'tester01' } },
  });

  const result = await getMyProfile({ skipErrorModal: true });

  expect(instance.get).toHaveBeenCalledWith('/users/me', { skipErrorModal: true });
  expect(result).toEqual({ loginId: 'tester01' });
});

test('getMyProfile을 옵션 없이 호출하면 빈 config로 GET한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { loginId: 'tester01' } },
  });

  await getMyProfile();

  expect(instance.get).toHaveBeenCalledWith('/users/me', {});
});
