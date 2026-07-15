import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FindPasswordPage from './FindPasswordPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/find-password']}>
      <Routes>
        <Route path="/find-password" element={<FindPasswordPage />} />
        <Route path="/login" element={<div>로그인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

const completeVerification = async () => {
  authApi.sendFindPasswordCode.mockResolvedValue({ success: true });
  authApi.verifyFindPasswordCode.mockResolvedValue({ success: true });

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await userEvent.type(screen.getByLabelText('인증번호'), '123456');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 확인' }));
  await waitFor(() => expect(screen.getByText('인증이 완료되었습니다.')).toBeInTheDocument());
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('처음에는 변경하기 버튼이 비활성화되어 있다', () => {
  renderPage();
  expect(screen.getByRole('button', { name: '변경하기' })).toBeDisabled();
});

test('이메일 인증 후 비밀번호를 변경하면 완료 모달을 보여준다', async () => {
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage();

  await completeVerification();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');

  const submit = screen.getByRole('button', { name: '변경하기' });
  expect(submit).toBeEnabled();
  await userEvent.click(submit);

  await waitFor(() => expect(screen.getByText('비밀번호 변경이 완료되었습니다.')).toBeInTheDocument());
  expect(authApi.resetPassword).toHaveBeenCalledWith('tester01', 'Password1!');
});

test('아이디를 바꾸면 인증 상태가 리셋된다', async () => {
  authApi.sendFindPasswordCode.mockResolvedValue({ success: true });
  renderPage();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await waitFor(() => expect(screen.getByLabelText('인증번호')).toBeInTheDocument());

  await userEvent.type(screen.getByLabelText('아이디'), 'x');

  expect(screen.queryByLabelText('인증번호')).not.toBeInTheDocument();
});

test('회원 정보가 없으면 서버 메시지를 보여준다', async () => {
  authApi.sendFindPasswordCode.mockRejectedValue({
    response: { status: 404, data: { success: false, message: '일치하는 회원 정보를 찾을 수 없습니다.' } },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));

  await waitFor(() =>
    expect(screen.getByText('일치하는 회원 정보를 찾을 수 없습니다.')).toBeInTheDocument()
  );
});

test('비밀번호 조건을 만족하지 않으면 에러를 보여주고 API를 호출하지 않는다', async () => {
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage();

  await completeVerification();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'short');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'short');
  await userEvent.click(screen.getByRole('button', { name: '변경하기' }));

  await waitFor(() =>
    expect(screen.getByText('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.')).toBeInTheDocument()
  );
  expect(authApi.resetPassword).not.toHaveBeenCalled();
});
