import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const renderPage = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/reset-password', state }]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/find-id" element={<div>아이디찾기페이지</div>} />
        <Route path="/login" element={<div>로그인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('state가 없으면 아이디 찾기 페이지로 리다이렉트한다', () => {
  renderPage(undefined);
  expect(screen.getByText('아이디찾기페이지')).toBeInTheDocument();
});

test('인증 상태가 유효하면 아이디가 readonly로 채워진 폼을 보여준다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: true } });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() => expect(screen.getByLabelText('아이디')).toHaveValue('tester01'));
  expect(screen.getByLabelText('아이디')).toHaveAttribute('readonly');
  expect(authApi.getPasswordResetStatus).toHaveBeenCalledWith('tester01');
});

test('인증 상태가 만료되었으면 폼 대신 안내 메시지를 보여준다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: false } });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() =>
    expect(screen.getByText('인증이 만료되었습니다. 아이디 찾기를 다시 진행해주세요.')).toBeInTheDocument()
  );
  expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument();
});

test('비밀번호 변경 성공 시 완료 모달을 보여준다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: true } });
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() => expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument());
  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'Password1!');
  await userEvent.click(screen.getByRole('button', { name: '변경하기' }));

  await waitFor(() => expect(screen.getByText('비밀번호 변경이 완료되었습니다.')).toBeInTheDocument());
  expect(authApi.resetPassword).toHaveBeenCalledWith('tester01', 'Password1!');
});

test('인증 상태 확인 자체가 실패하면 만료 메시지 대신 오류 메시지와 재시도 버튼을 보여준다', async () => {
  authApi.getPasswordResetStatus.mockRejectedValue(new Error('Network Error'));
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() =>
    expect(
      screen.getByText('인증 상태를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    ).toBeInTheDocument()
  );
  expect(screen.queryByText('인증이 만료되었습니다. 아이디 찾기를 다시 진행해주세요.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
});

test('비밀번호가 일치하지 않으면 변경하기 버튼이 비활성화된다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: true } });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() => expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument());
  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'Password2!');

  expect(screen.getByRole('button', { name: '변경하기' })).toBeDisabled();
});
