import { vi } from 'vitest';
import instance from './axiosInstance';
import {
  checkLoginId, sendEmailCode, verifyEmailCode, signup, login, logout,
} from './authApi';

const ok = (data) => ({ data: { success: true, message: '', data } });

beforeEach(() => {
  vi.restoreAllMocks();
});

test('checkLoginId는 value 쿼리로 GET 요청한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue(ok({ available: true }));
  const result = await checkLoginId('tester01');
  expect(instance.get).toHaveBeenCalledWith('/auth/check-login-id', { params: { value: 'tester01' } });
  expect(result.data.available).toBe(true);
});

test('sendEmailCode는 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendEmailCode('a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/email/send-code', { email: 'a@b.com' });
});

test('verifyEmailCode는 이메일과 코드를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await verifyEmailCode('a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith('/auth/email/verify-code', { email: 'a@b.com', code: '123456' });
});

test('signup은 가입 정보를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  const body = { loginId: 'tester01', email: 'a@b.com', password: 'password123', name: '홍길동' };
  await signup(body);
  expect(instance.post).toHaveBeenCalledWith('/auth/signup', body);
});

test('login은 토큰을 반환한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok({ accessToken: 'at', refreshToken: 'rt' }));
  const result = await login({ loginId: 'tester01', password: 'password123', rememberMe: true });
  expect(instance.post).toHaveBeenCalledWith('/auth/login', {
    loginId: 'tester01', password: 'password123', rememberMe: true,
  });
  expect(result.data.accessToken).toBe('at');
});

test('logout은 refreshToken을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await logout('rt-1');
  expect(instance.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'rt-1' });
});
