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

const goToCodeStep = async () => {
  authApi.sendFindPasswordCode.mockResolvedValue({ success: true });
  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '다음' }));
  await waitFor(() => expect(screen.getByLabelText('인증코드')).toBeInTheDocument());
};

const goToPasswordStep = async () => {
  await goToCodeStep();
  authApi.verifyFindPasswordCode.mockResolvedValue({ success: true });
  await userEvent.type(screen.getByLabelText('인증코드'), '123456');
  await userEvent.click(screen.getByRole('button', { name: '확인' }));
  await waitFor(() => expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument());
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('처음에는 아이디/이메일 입력 단계만 보여준다', () => {
  renderPage();
  expect(screen.getByLabelText('아이디')).toBeInTheDocument();
  expect(screen.getByLabelText('이메일')).toBeInTheDocument();
  expect(screen.queryByLabelText('인증코드')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument();
});

test('아이디+이메일 확인 성공 시 인증코드 단계로 넘어가고 아이디/이메일 입력란은 사라진다', async () => {
  renderPage();
  await goToCodeStep();

  expect(authApi.sendFindPasswordCode).toHaveBeenCalledWith('tester01', 'user@example.com');
  expect(screen.queryByLabelText('아이디')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument();
});

test('회원 정보가 없으면 1단계에 머무르며 서버 메시지를 보여준다', async () => {
  authApi.sendFindPasswordCode.mockRejectedValue({
    response: { status: 404, data: { success: false, message: '일치하는 회원 정보를 찾을 수 없습니다.' } },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '다음' }));

  await waitFor(() =>
    expect(screen.getByText('일치하는 회원 정보를 찾을 수 없습니다.')).toBeInTheDocument()
  );
  expect(screen.getByLabelText('아이디')).toBeInTheDocument();
});

test('인증코드 확인 성공 시 새 비밀번호 단계로 넘어간다', async () => {
  renderPage();
  await goToPasswordStep();

  expect(authApi.verifyFindPasswordCode).toHaveBeenCalledWith('tester01', 'user@example.com', '123456');
  expect(screen.queryByLabelText('인증코드')).not.toBeInTheDocument();
});

test('인증코드가 틀리면 2단계에 머무르며 에러 메시지를 보여준다', async () => {
  renderPage();
  await goToCodeStep();

  authApi.verifyFindPasswordCode.mockRejectedValue({
    response: { status: 400, data: { success: false, message: '인증번호가 일치하지 않거나 만료되었습니다.' } },
  });
  await userEvent.type(screen.getByLabelText('인증코드'), '000000');
  await userEvent.click(screen.getByRole('button', { name: '확인' }));

  await waitFor(() =>
    expect(screen.getByText('인증번호가 일치하지 않거나 만료되었습니다.')).toBeInTheDocument()
  );
  expect(screen.getByLabelText('인증코드')).toBeInTheDocument();
});

test('인증코드 재전송 클릭 시 발송 API가 다시 호출된다', async () => {
  renderPage();
  await goToCodeStep();

  await userEvent.click(screen.getByRole('button', { name: '인증코드 재전송' }));

  await waitFor(() => expect(authApi.sendFindPasswordCode).toHaveBeenCalledTimes(2));
});

test('새 비밀번호 입력 후 변경하기 클릭 시 완료 모달을 보여준다', async () => {
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage();
  await goToPasswordStep();

  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'Password1!');

  const submit = screen.getByRole('button', { name: '변경하기' });
  expect(submit).toBeEnabled();
  await userEvent.click(submit);

  await waitFor(() => expect(screen.getByText('비밀번호 변경이 완료되었습니다.')).toBeInTheDocument());
  expect(authApi.resetPassword).toHaveBeenCalledWith('tester01', 'Password1!');
});

test('비밀번호 확인을 입력하지 않으면 변경하기 버튼이 비활성화되어 있다', async () => {
  renderPage();
  await goToPasswordStep();

  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'Password1!');

  expect(screen.getByRole('button', { name: '변경하기' })).toBeDisabled();
});

test('비밀번호가 일치하지 않으면 변경하기 버튼이 비활성화된다', async () => {
  renderPage();
  await goToPasswordStep();

  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'Password2!');

  expect(screen.getByRole('button', { name: '변경하기' })).toBeDisabled();
});

test('비밀번호 조건을 만족하지 않으면 에러를 보여주고 API를 호출하지 않는다', async () => {
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage();
  await goToPasswordStep();

  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'short11');
  await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'short11');
  await userEvent.click(screen.getByRole('button', { name: '변경하기' }));

  await waitFor(() =>
    expect(screen.getByText('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.')).toBeInTheDocument()
  );
  expect(authApi.resetPassword).not.toHaveBeenCalled();
});
