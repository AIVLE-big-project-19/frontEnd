import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import PasswordResetSuccessModal from './PasswordResetSuccessModal';
import { saveSession, setAccessToken, loadSession, getAccessToken, clearSession } from '../auth/tokenStorage';

const LoginProbe = () => {
  const location = useLocation();
  return <div>로그인페이지:{location.state?.loginId}</div>;
};

beforeEach(() => {
  clearSession();
});

const renderModal = (loginId = 'tester01') =>
  render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<PasswordResetSuccessModal loginId={loginId} />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );

test('완료 메시지를 보여준다', () => {
  renderModal();
  expect(screen.getByText('비밀번호 변경이 완료되었습니다.')).toBeInTheDocument();
});

test('로그인 버튼 클릭 시 세션을 정리하고 loginId와 함께 로그인 페이지로 이동한다', async () => {
  setAccessToken('at');
  saveSession({ refreshToken: 'rt', loginId: 'old', rememberMe: true });

  renderModal('tester01');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  expect(screen.getByText('로그인페이지:tester01')).toBeInTheDocument();
  expect(getAccessToken()).toBeNull();
  expect(loadSession()).toBeNull();
});
