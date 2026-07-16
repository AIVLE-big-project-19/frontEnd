import { vi } from 'vitest';
import instance from './axiosInstance';
import {
  checkLoginId, sendEmailCode, verifyEmailCode, signup, login, logout,
  sendFindIdCode, verifyFindIdCode, sendFindPasswordCode, verifyFindPasswordCode,
  getPasswordResetStatus, resetPassword, googleLogin,
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

test('sendFindIdCode는 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendFindIdCode('a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/find-id/send-code', { email: 'a@b.com' });
});

test('verifyFindIdCode는 이메일과 코드를 POST하고 결과를 반환한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(
    ok({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' })
  );
  const result = await verifyFindIdCode('a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith('/auth/find-id/verify-code', { email: 'a@b.com', code: '123456' });
  expect(result.data.loginId).toBe('tester01');
  expect(result.data.maskedLoginId).toBe('te******');
});

test('sendFindPasswordCode는 아이디와 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendFindPasswordCode('tester01', 'a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/password/send-code', { loginId: 'tester01', email: 'a@b.com' });
});

test('verifyFindPasswordCode는 아이디/이메일/코드를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await verifyFindPasswordCode('tester01', 'a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith('/auth/password/verify-code', {
    loginId: 'tester01', email: 'a@b.com', code: '123456',
  });
});

test('getPasswordResetStatus는 loginId 쿼리로 GET 요청한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue(ok({ verified: true }));
  const result = await getPasswordResetStatus('tester01');
  expect(instance.get).toHaveBeenCalledWith('/auth/password/verification-status', { params: { loginId: 'tester01' } });
  expect(result.data.verified).toBe(true);
});

test('resetPassword는 아이디와 새 비밀번호를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await resetPassword('tester01', 'NewPassword1!');
  expect(instance.post).toHaveBeenCalledWith('/auth/password/reset', {
    loginId: 'tester01', newPassword: 'NewPassword1!',
  });
});

test('googleLogin은 code와 redirectUri를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok({ accessToken: 'at', refreshToken: 'rt' }));
  const result = await googleLogin({ code: 'auth-code-1', redirectUri: 'http://localhost:5173/oauth/google/callback' });
  expect(instance.post).toHaveBeenCalledWith('/auth/google/login', {
    code: 'auth-code-1',
    redirectUri: 'http://localhost:5173/oauth/google/callback',
  });
  expect(result.data.accessToken).toBe('at');
});
