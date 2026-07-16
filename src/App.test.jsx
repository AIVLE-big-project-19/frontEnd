import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './App';
import * as authApi from './api/authApi';

vi.mock('./pages/MainPage', () => ({
  default: () => <div>메인페이지</div>,
}));

vi.mock('./api/authApi');

const renderAt = (entry) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>
  );

test('/ 경로에서 메인 페이지를 보여준다', async () => {
  renderAt('/');
  await waitFor(() => expect(screen.getByText('메인페이지')).toBeInTheDocument());
});

test('/login 경로에서 로그인 페이지를 보여준다', async () => {
  renderAt('/login');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'SolarAivle' })).toBeInTheDocument());
});

test('/signup 경로에서 회원가입 페이지를 보여준다', async () => {
  renderAt('/signup');
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'SolarAivle에 오신 것을 환영합니다' })).toBeInTheDocument()
  );
});

test('/find-id 경로에서 아이디 찾기 페이지를 보여준다', async () => {
  renderAt('/find-id');
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'SolarAivle ID 찾기' })).toBeInTheDocument()
  );
});

test('/show-id 경로에서 아이디 찾기 결과 페이지를 보여준다', async () => {
  renderAt({
    pathname: '/show-id',
    state: { loginId: 'tester01', maskedLoginId: 'te****01', createdAt: '2026-01-01T00:00:00.000Z' },
  });
  await waitFor(() => expect(screen.getByText(/te\*\*\*\*01/)).toBeInTheDocument());
});

test('/find-password 경로에서 비밀번호 찾기 페이지를 보여준다', async () => {
  renderAt('/find-password');
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: '비밀번호 찾기' })).toBeInTheDocument()
  );
});

test('/reset-password 경로에서 비밀번호 재설정 페이지를 보여준다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: true } });
  renderAt({ pathname: '/reset-password', state: { loginId: 'tester01', verified: true } });
  await waitFor(() => expect(screen.getByLabelText('아이디')).toHaveValue('tester01'));
});

test('/oauth/google/callback 경로에서 콜백 페이지를 보여준다', async () => {
  authApi.googleLogin.mockReturnValue(new Promise(() => {}));
  renderAt('/oauth/google/callback?code=test-code');
  await waitFor(() => expect(screen.getByText('로그인 처리 중...')).toBeInTheDocument());
});
