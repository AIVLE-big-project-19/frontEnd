import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GoogleCallbackPage from './GoogleCallbackPage';
import * as authApi from '../api/authApi';
import * as myPageApi from '../api/myPageApi';

vi.mock('../api/authApi');
vi.mock('../api/myPageApi');

const mockAuthLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockAuthLogin }),
}));

const renderCallback = (search) =>
  render(
    <MemoryRouter initialEntries={[`/oauth/google/callback${search}`]}>
      <Routes>
        <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/login" element={<div>로그인페이지</div>} />
        <Route path="/" element={<div>메인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('code가 있으면 googleLogin 후 프로필을 조회하고 로그인 처리한 뒤 메인으로 이동한다', async () => {
  authApi.googleLogin.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  myPageApi.getMyProfile.mockResolvedValue({ loginId: 'tester01', name: '홍길동' });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('메인페이지')).toBeInTheDocument());
  expect(authApi.googleLogin).toHaveBeenCalledWith({
    code: 'auth-code-1',
    redirectUri: expect.stringContaining('/oauth/google/callback'),
  });
  expect(mockAuthLogin).toHaveBeenCalledWith(
    { accessToken: 'at', refreshToken: 'rt' }, 'tester01', true
  );
});

test('code 파라미터가 없으면 로그인 페이지로 리다이렉트한다', async () => {
  renderCallback('');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(authApi.googleLogin).not.toHaveBeenCalled();
});

test('409 에러면 일반 로그인 안내 메시지와 함께 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockRejectedValue({
    response: { status: 409, data: { success: false, message: '이미 가입된 이메일' } },
  });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('502 에러면 일반 실패로 처리하고 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockRejectedValue({
    response: { status: 502, data: { success: false, message: 'GOOGLE_AUTH_FAILED' } },
  });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('프로필 조회에 실패하면 로그인 처리를 하지 않고 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  myPageApi.getMyProfile.mockRejectedValue({ response: { status: 401 } });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('처리 중에는 안내 문구를 보여준다', () => {
  authApi.googleLogin.mockReturnValue(new Promise(() => {}));
  renderCallback('?code=auth-code-1');
  expect(screen.getByText('로그인 처리 중...')).toBeInTheDocument();
});
