import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

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

test('빈 필드로 제출하면 API를 호출하지 않는다', async () => {
  renderLogin();
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));
  expect(authApi.login).not.toHaveBeenCalled();
});

test('회원가입 완료 안내 메시지를 표시한다', () => {
  renderLogin([{ pathname: '/login', state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } }]);
  expect(screen.getByText('회원가입이 완료되었습니다. 로그인해주세요.')).toBeInTheDocument();
});
