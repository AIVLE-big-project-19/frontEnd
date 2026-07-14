import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './App';

vi.mock('./pages/MainPage', () => ({
  default: () => <div>메인페이지</div>,
}));

const renderAt = (path) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
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
  await waitFor(() => expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument());
});

test('/signup 경로에서 회원가입 페이지를 보여준다', async () => {
  renderAt('/signup');
  await waitFor(() => expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument());
});
