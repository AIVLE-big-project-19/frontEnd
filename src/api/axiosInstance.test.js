import { vi } from 'vitest';
import instance, { attachAuthHeader, handleResponseError } from './axiosInstance';
import { setAccessToken, getAccessToken, saveSession, loadSession, clearSession } from '../auth/tokenStorage';
import * as errorToastStore from '../notifications/errorToastStore';

vi.mock('../notifications/errorToastStore');

beforeEach(() => {
  clearSession();
  sessionStorage.removeItem('authExpiredMessage');
  vi.restoreAllMocks();
  vi.clearAllMocks();
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

    expect(instance.post).toHaveBeenCalledWith(
      '/auth/token/refresh', { refreshToken: 'rt-old' }, { skipErrorModal: true }
    );
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
    expect(sessionStorage.getItem('authExpiredMessage')).toBe(
      '로그인이 만료되었습니다. 다시 로그인해주세요.'
    );
  });

  test('401이 아닌 에러는 그대로 reject한다', async () => {
    const error = { config: { url: '/x' }, response: { status: 500 } };
    await expect(handleResponseError(error)).rejects.toBe(error);
  });

  test('동시에 여러 401이 발생해도 refresh는 한 번만 호출된다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
    });
    vi.spyOn(instance, 'request').mockResolvedValue({ data: 'ok' });

    const [result1, result2] = await Promise.all([
      handleResponseError(make401('/some/protected')),
      handleResponseError(make401('/some/other-protected')),
    ]);

    expect(instance.post).toHaveBeenCalledTimes(1);
    expect(instance.post).toHaveBeenCalledWith(
      '/auth/token/refresh', { refreshToken: 'rt-old' }, { skipErrorModal: true }
    );
    expect(instance.request).toHaveBeenCalledTimes(2);
    expect(result1).toEqual({ data: 'ok' });
    expect(result2).toEqual({ data: 'ok' });
  });

  test('세션이 없으면 refresh를 시도하지 않고 그대로 reject한다', async () => {
    clearSession();
    const spy = vi.spyOn(instance, 'post');
    await expect(handleResponseError(make401('/some/protected'))).rejects.toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  test('일반 실패 응답이면 message를 토스트로 표시한다', async () => {
    const error = {
      config: { url: '/boards' },
      response: { status: 500, data: { success: false, message: '서버 오류가 발생했습니다.', data: null } },
    };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(errorToastStore.showErrorToast).toHaveBeenCalledWith('서버 오류가 발생했습니다.');
  });

  test('응답 자체가 없으면(네트워크 오류) 기본 문구를 토스트로 표시한다', async () => {
    const error = { config: { url: '/boards' } };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(errorToastStore.showErrorToast).toHaveBeenCalledWith('네트워크 연결을 확인해주세요.');
  });

  test('config.skipErrorModal이 true면 토스트를 표시하지 않는다', async () => {
    const error = {
      config: { url: '/auth/login', skipErrorModal: true },
      response: {
        status: 401,
        data: { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.', data: null },
      },
    };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(errorToastStore.showErrorToast).not.toHaveBeenCalled();
  });

  test('세션 만료로 하드 리다이렉트되는 경로에서는 토스트를 표시하지 않는다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockRejectedValue({ response: { status: 401 } });

    await expect(handleResponseError(make401('/some/protected'))).rejects.toBeTruthy();

    expect(errorToastStore.showErrorToast).not.toHaveBeenCalled();
  });

  test('refresh 요청 자체에는 skipErrorModal이 붙어서 나간다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
    });
    vi.spyOn(instance, 'request').mockResolvedValue({ data: 'ok' });

    await handleResponseError(make401('/some/protected'));

    expect(instance.post).toHaveBeenCalledWith(
      '/auth/token/refresh', { refreshToken: 'rt-old' }, { skipErrorModal: true }
    );
  });
});
