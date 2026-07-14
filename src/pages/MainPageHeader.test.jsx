import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthNav from '../components/AuthNav';

const mockLogout = vi.fn();
let mockAuthState = { isLoggedIn: false, loginId: null, logout: mockLogout };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const renderNav = () =>
  render(
    <MemoryRouter>
      <AuthNav />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('비로그인 상태면 로그인/회원가입 링크를 보여준다', () => {
  mockAuthState = { isLoggedIn: false, loginId: null, logout: mockLogout };
  renderNav();
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/signup');
});

test('로그인 상태면 loginId와 로그아웃 버튼을 보여준다', () => {
  mockAuthState = { isLoggedIn: true, loginId: 'tester01', logout: mockLogout };
  renderNav();
  expect(screen.getByText('tester01님')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
});

test('로그아웃 버튼 클릭 시 logout을 호출한다', async () => {
  mockAuthState = { isLoggedIn: true, loginId: 'tester01', logout: mockLogout };
  renderNav();
  await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
  expect(mockLogout).toHaveBeenCalled();
});
