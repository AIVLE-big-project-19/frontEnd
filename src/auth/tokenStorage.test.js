import {
  getAccessToken, setAccessToken,
  getAccessTokenRole,
  saveSession, loadSession, updateRefreshToken, clearSession,
} from './tokenStorage';

beforeEach(() => {
  clearSession();
});

test('accessToken은 메모리에 저장하고 읽는다', () => {
  expect(getAccessToken()).toBeNull();
  setAccessToken('at-1');
  expect(getAccessToken()).toBe('at-1');
});

test('accessToken의 role 클레임을 읽는다', () => {
  const payload = btoa(JSON.stringify({ role: 'ADMIN' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  setAccessToken(`header.${payload}.signature`);

  expect(getAccessTokenRole()).toBe('ADMIN');
});

test('rememberMe=true면 localStorage에 저장한다', () => {
  saveSession({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });
  expect(localStorage.getItem('refreshToken')).toBe('rt-1');
  expect(localStorage.getItem('loginId')).toBe('tester01');
  expect(sessionStorage.getItem('refreshToken')).toBeNull();
});

test('rememberMe=false면 sessionStorage에 저장한다', () => {
  saveSession({ refreshToken: 'rt-2', loginId: 'tester02', rememberMe: false });
  expect(sessionStorage.getItem('refreshToken')).toBe('rt-2');
  expect(localStorage.getItem('refreshToken')).toBeNull();
});

test('loadSession은 저장된 세션을 복원한다 (localStorage 우선)', () => {
  saveSession({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });
  expect(loadSession()).toEqual({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });

  saveSession({ refreshToken: 'rt-2', loginId: 'tester02', rememberMe: false });
  expect(loadSession()).toEqual({ refreshToken: 'rt-2', loginId: 'tester02', rememberMe: false });
});

test('세션이 없으면 loadSession은 null을 반환한다', () => {
  expect(loadSession()).toBeNull();
});

test('updateRefreshToken은 현재 세션 스토리지의 토큰만 교체한다', () => {
  saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: false });
  updateRefreshToken('rt-new');
  expect(sessionStorage.getItem('refreshToken')).toBe('rt-new');
  expect(sessionStorage.getItem('loginId')).toBe('tester01');
});

test('clearSession은 모든 토큰을 삭제한다', () => {
  setAccessToken('at-1');
  saveSession({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });
  clearSession();
  expect(getAccessToken()).toBeNull();
  expect(loadSession()).toBeNull();
});
