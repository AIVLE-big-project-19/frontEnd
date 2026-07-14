import { vi } from 'vitest';
import instance, { attachAuthHeader, handleResponseError } from './axiosInstance';
import { setAccessToken, getAccessToken, saveSession, loadSession, clearSession } from '../auth/tokenStorage';

beforeEach(() => {
  clearSession();
  vi.restoreAllMocks();
});

describe('attachAuthHeader', () => {
  test('accessToken이 있으면 Authorization 헤더를 붙인다', () => {
    setAccessToken('at-1');
    const config = attachAuthHeader({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer at-1');
  });

  test('accessToken이 없으면 헤더를 붙이지 않는다', () => {
    const config = attachAuthHeader({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('handleResponseError', () => {
  const make401 = (url, extra = {}) => ({
    config: { url, headers: {}, ...extra },
    response: { status: 401 },
  });

  test('401이면 refresh 후 원요청을 재시도한다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
    });
    const retried = { data: 'ok' };
    vi.spyOn(instance, 'request').mockResolvedValue(retried);

    const result = await handleResponseError(make401('/some/protected'));

    expect(instance.post).toHaveBeenCalledWith('/auth/token/refresh', { refreshToken: 'rt-old' });
    expect(getAccessToken()).toBe('at-new');
    expect(loadSession().refreshToken).toBe('rt-new');
    expect(result).toBe(retried);
  });

  test('로그인 요청의 401은 refresh를 시도하지 않는다', async () => {
    const spy = vi.spyOn(instance, 'post');
    await expect(handleResponseError(make401('/auth/login'))).rejects.toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  test('이미 재시도한 요청의 401은 그대로 reject한다', async () => {
    const spy = vi.spyOn(instance, 'post');
    await expect(handleResponseError(make401('/some/protected', { _retry: true }))).rejects.toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  test('refresh 실패 시 세션을 삭제한다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockRejectedValue({ response: { status: 401 } });

    await expect(handleResponseError(make401('/some/protected'))).rejects.toBeTruthy();
    expect(loadSession()).toBeNull();
  });

  test('401이 아닌 에러는 그대로 reject한다', async () => {
    const error = { config: { url: '/x' }, response: { status: 500 } };
    await expect(handleResponseError(error)).rejects.toBe(error);
  });
});
