import { vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import instance from '../api/axiosInstance';
import { saveSession, loadSession, clearSession, getAccessToken } from '../auth/tokenStorage';

vi.mock('../api/authApi', () => ({
  logout: vi.fn().mockResolvedValue({ success: true }),
}));

const Probe = () => {
  const { isLoggedIn, loginId, isInitializing, login, logout } = useAuth();
  if (isInitializing) return <div>초기화중</div>;
  return (
    <div>
      <div data-testid="status">{isLoggedIn ? `로그인:${loginId}` : '비로그인'}</div>
      <button onClick={() => login({ accessToken: 'at', refreshToken: 'rt' }, 'tester01', true)}>
        로그인실행
      </button>
      <button onClick={logout}>로그아웃실행</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

beforeEach(() => {
  clearSession();
  sessionStorage.removeItem('authExpiredMessage');
  vi.restoreAllMocks();
});

test('저장된 세션이 없으면 비로그인 상태로 시작한다', async () => {
  renderWithProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('비로그인'));
});

test('login 호출 시 로그인 상태가 되고 토큰이 저장된다', async () => {
  renderWithProvider();
  await waitFor(() => screen.getByTestId('status'));
  await userEvent.click(screen.getByText('로그인실행'));
  expect(screen.getByTestId('status')).toHaveTextContent('로그인:tester01');
  expect(getAccessToken()).toBe('at');
  expect(loadSession()).toEqual({ refreshToken: 'rt', loginId: 'tester01', rememberMe: true });
});

test('저장된 refreshToken이 있으면 부팅 시 세션을 복원한다', async () => {
  saveSession({ refreshToken: 'rt-saved', loginId: 'tester01', rememberMe: true });
  vi.spyOn(instance, 'post').mockResolvedValue({
    data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
  });

  renderWithProvider();

  await waitFor(() =>
    expect(screen.getByTestId('status')).toHaveTextContent('로그인:tester01')
  );
  expect(getAccessToken()).toBe('at-new');
  expect(loadSession().refreshToken).toBe('rt-new');
});

test('부팅 시 refresh 실패하면 비로그인 상태로 시작하고 세션이 삭제된다', async () => {
  saveSession({ refreshToken: 'rt-bad', loginId: 'tester01', rememberMe: true });
  vi.spyOn(instance, 'post').mockRejectedValue({ response: { status: 401 } });

  renderWithProvider();

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('비로그인'));
  expect(loadSession()).toBeNull();
  expect(sessionStorage.getItem('authExpiredMessage')).toBe(
    '로그인이 만료되었습니다. 다시 로그인해주세요.'
  );
});

test('StrictMode로 effect가 두 번 실행돼도 refresh 요청은 한 번만 나가고 세션이 정상 복원된다', async () => {
  saveSession({ refreshToken: 'rt-saved', loginId: 'tester01', rememberMe: true });

  // 1회용(rotating) refreshToken을 흉내낸다: 같은 토큰으로 두 번 요청하면 두 번째는 실패한다.
  const usedTokens = new Set();
  vi.spyOn(instance, 'post').mockImplementation((url, body) => {
    if (url === '/auth/token/refresh') {
      if (usedTokens.has(body.refreshToken)) {
        return Promise.reject({ response: { status: 401 } });
      }
      usedTokens.add(body.refreshToken);
      return Promise.resolve({
        data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
      });
    }
    return Promise.reject(new Error('unexpected url'));
  });

  render(
    <StrictMode>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </StrictMode>
  );

  await waitFor(() =>
    expect(screen.getByTestId('status')).toHaveTextContent('로그인:tester01')
  );

  expect(instance.post).toHaveBeenCalledTimes(1);
  expect(getAccessToken()).toBe('at-new');
  expect(loadSession()).toEqual({ refreshToken: 'rt-new', loginId: 'tester01', rememberMe: true });
});

test('logout 호출 시 비로그인 상태가 되고 세션이 삭제된다', async () => {
  renderWithProvider();
  await waitFor(() => screen.getByTestId('status'));
  await userEvent.click(screen.getByText('로그인실행'));
  await userEvent.click(screen.getByText('로그아웃실행'));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('비로그인'));
  expect(loadSession()).toBeNull();
  expect(getAccessToken()).toBeNull();
});
