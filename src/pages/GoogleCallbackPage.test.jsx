import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import GoogleCallbackPage from './GoogleCallbackPage';
import * as authApi from '../api/authApi';
import * as myPageApi from '../api/myPageApi';

vi.mock('../api/authApi');
vi.mock('../api/myPageApi');

const mockAuthLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockAuthLogin }),
}));

const VALID_STATE = 'valid-state-123';

const LoginPageProbe = () => {
  const location = useLocation();
  return (
    <div>
      로그인페이지
      {location.state?.message && <p>{location.state.message}</p>}
    </div>
  );
};

const renderCallback = (search) =>
  render(
    <MemoryRouter initialEntries={[`/oauth/google/callback${search}`]}>
      <Routes>
        <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/login" element={<LoginPageProbe />} />
        <Route path="/" element={<div>메인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.setItem('googleOAuthState', VALID_STATE);
});

afterEach(() => {
  sessionStorage.clear();
});

test('code와 state가 있으면 googleLogin 후 프로필을 조회하고 로그인 처리한 뒤 메인으로 이동한다', async () => {
  authApi.googleLogin.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  myPageApi.getMyProfile.mockResolvedValue({ loginId: 'tester01', name: '홍길동' });

  renderCallback(`?code=auth-code-1&state=${VALID_STATE}`);

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
  renderCallback(`?state=${VALID_STATE}`);

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(authApi.googleLogin).not.toHaveBeenCalled();
});

test('state가 없거나 저장된 값과 다르면 googleLogin을 호출하지 않고 로그인 페이지로 이동한다', async () => {
  renderCallback('?code=auth-code-1&state=wrong-state');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(authApi.googleLogin).not.toHaveBeenCalled();
});

test('409 에러면 일반 로그인 안내 메시지와 함께 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockRejectedValue({
    response: { status: 409, data: { success: false, message: '이미 가입된 이메일' } },
  });

  renderCallback(`?code=auth-code-1&state=${VALID_STATE}`);

  await waitFor(() =>
    expect(screen.getByText('이미 일반 회원가입된 이메일입니다. 일반 로그인을 이용해주세요.')).toBeInTheDocument()
  );
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('502 에러면 일반 실패 메시지와 함께 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockRejectedValue({
    response: { status: 502, data: { success: false, message: 'GOOGLE_AUTH_FAILED' } },
  });

  renderCallback(`?code=auth-code-1&state=${VALID_STATE}`);

  await waitFor(() =>
    expect(screen.getByText('구글 로그인에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument()
  );
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('프로필 조회에 실패하면 로그인 처리를 하지 않고 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  myPageApi.getMyProfile.mockRejectedValue({ response: { status: 401 } });

  renderCallback(`?code=auth-code-1&state=${VALID_STATE}`);

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('처리 중에는 안내 문구를 보여준다', () => {
  authApi.googleLogin.mockReturnValue(new Promise(() => {}));
  renderCallback(`?code=auth-code-1&state=${VALID_STATE}`);
  expect(screen.getByText('로그인 처리 중...')).toBeInTheDocument();
});
