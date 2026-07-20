import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import * as authApi from '../api/authApi';
import * as googleOAuth from '../auth/googleOAuth';
import * as termsApi from '../api/termsApi';

vi.mock('../api/authApi');
vi.mock('../auth/googleOAuth');
vi.mock('../api/termsApi');

const mockAuthLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockAuthLogin }),
}));

const renderLogin = (initialEntries = ['/login']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>메인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.removeItem('authExpiredMessage');
});

test('로그인 성공 시 auth.login을 호출하고 메인으로 이동한다', async () => {
  authApi.login.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123');
  await userEvent.click(screen.getByLabelText('로그인 상태 유지'));
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() => expect(screen.getByText('메인페이지')).toBeInTheDocument());
  expect(authApi.login).toHaveBeenCalledWith({
    loginId: 'tester01', password: 'password123', rememberMe: true,
  });
  expect(mockAuthLogin).toHaveBeenCalledWith(
    { accessToken: 'at', refreshToken: 'rt' }, 'tester01', true
  );
});

test('로그인 실패(401) 시 에러 메시지를 보여준다', async () => {
  authApi.login.mockRejectedValue({
    response: { status: 401, data: { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' } },
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'wrongpass1');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() =>
    expect(screen.getByText('아이디 또는 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
  );
});

test('계정 잠금(423) 시 서버 메시지와 비밀번호 재설정 링크를 함께 보여준다', async () => {
  authApi.login.mockRejectedValue({
    response: {
      status: 423,
      data: { success: false, message: '로그인 시도 횟수를 초과하여 계정이 일시적으로 잠겼습니다. 12분 후 다시 시도해주세요.', data: null },
    },
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'wrongpass1');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() =>
    expect(
      screen.getByText('로그인 시도 횟수를 초과하여 계정이 일시적으로 잠겼습니다. 12분 후 다시 시도해주세요.')
    ).toBeInTheDocument()
  );
  expect(screen.getByRole('link', { name: '비밀번호 재설정' })).toHaveAttribute('href', '/find-password');
});

test('일반 로그인 실패(401)에는 비밀번호 재설정 링크가 보이지 않는다', async () => {
  authApi.login.mockRejectedValue({
    response: { status: 401, data: { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' } },
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'wrongpass1');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() =>
    expect(screen.getByText('아이디 또는 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
  );
  expect(screen.queryByRole('link', { name: '비밀번호 재설정' })).not.toBeInTheDocument();
});

test('잠금 후 다시 로그인 성공하면 재설정 링크가 사라진다', async () => {
  authApi.login.mockRejectedValueOnce({
    response: { status: 423, data: { success: false, message: '계정이 일시적으로 잠겼습니다.' } },
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'wrongpass1');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));
  await waitFor(() => expect(screen.getByRole('link', { name: '비밀번호 재설정' })).toBeInTheDocument());

  authApi.login.mockResolvedValueOnce({ success: true, data: { accessToken: 'at', refreshToken: 'rt' } });
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() => expect(screen.getByText('메인페이지')).toBeInTheDocument());
});

test('빈 필드로 제출하면 API를 호출하지 않는다', async () => {
  renderLogin();
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));
  expect(authApi.login).not.toHaveBeenCalled();
});

test('회원가입 완료 안내 메시지를 표시한다', () => {
  renderLogin([{ pathname: '/login', state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } }]);
  expect(screen.getByText('회원가입이 완료되었습니다. 로그인해주세요.')).toBeInTheDocument();
});

test('세션 만료 메시지가 sessionStorage에 있으면 표시하고 이후 제거한다', () => {
  sessionStorage.setItem('authExpiredMessage', '로그인이 만료되었습니다. 다시 로그인해주세요.');
  renderLogin();
  expect(
    screen.getByText('로그인이 만료되었습니다. 다시 로그인해주세요.')
  ).toBeInTheDocument();
  expect(sessionStorage.getItem('authExpiredMessage')).toBeNull();
});

test('location.state.loginId가 있으면 아이디 입력란에 자동으로 채워진다', () => {
  renderLogin([{ pathname: '/login', state: { loginId: 'tester01' } }]);
  expect(screen.getByLabelText('아이디')).toHaveValue('tester01');
});

test('Google로 계속하기 클릭 시 구글 인증 URL로 이동한다', async () => {
  googleOAuth.buildGoogleAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');

  const originalLocation = window.location;
  delete window.location;
  window.location = { ...originalLocation, href: '' };

  renderLogin();
  await userEvent.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

  expect(window.location.href).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1');

  window.location = originalLocation;
});

test('회원가입, 아이디 찾기, 비밀번호 찾기 링크가 한 줄에 나란히 표시된다', () => {
  renderLogin();

  expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/signup');
  expect(screen.getByRole('link', { name: '아이디 찾기' })).toHaveAttribute('href', '/find-id');
  expect(screen.getByRole('link', { name: '비밀번호 찾기' })).toHaveAttribute('href', '/find-password');
  expect(screen.queryByText('계정이 없으신가요?')).not.toBeInTheDocument();
});

test('구글 로그인 안내 문구와 약관 링크를 보여준다', () => {
  renderLogin();
  expect(screen.getByText(/구글 로그인 시/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '이용약관' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '개인정보처리방침' })).toBeInTheDocument();
});

test('안내 문구의 개인정보처리방침 클릭 시 약관 모달이 뜬다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'PRIVACY', version: '1.0', content: '본문' });
  renderLogin();

  await userEvent.click(screen.getByRole('button', { name: '개인정보처리방침' }));

  await waitFor(() => expect(screen.getByText('본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('PRIVACY');
});
