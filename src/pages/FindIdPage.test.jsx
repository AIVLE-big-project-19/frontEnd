import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FindIdPage from './FindIdPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/find-id']}>
      <Routes>
        <Route path="/find-id" element={<FindIdPage />} />
        <Route path="/show-id" element={<div>결과페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('처음에는 아이디 찾기 버튼이 비활성화되어 있다', () => {
  renderPage();
  expect(screen.getByRole('button', { name: '아이디 찾기' })).toBeDisabled();
});

test('이메일 인증 후 아이디 찾기 버튼이 활성화되고 클릭 시 결과 페이지로 이동한다', async () => {
  authApi.sendFindIdCode.mockResolvedValue({ success: true });
  authApi.verifyFindIdCode.mockResolvedValue({
    success: true,
    data: { loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await userEvent.type(screen.getByLabelText('인증번호'), '123456');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 확인' }));

  await waitFor(() => expect(screen.getByRole('button', { name: '아이디 찾기' })).toBeEnabled());
  await userEvent.click(screen.getByRole('button', { name: '아이디 찾기' }));

  await waitFor(() => expect(screen.getByText('결과페이지')).toBeInTheDocument());
});

test('인증코드가 틀리면 에러 메시지를 보여준다', async () => {
  authApi.sendFindIdCode.mockResolvedValue({ success: true });
  authApi.verifyFindIdCode.mockRejectedValue({
    response: { status: 400, data: { success: false, message: '인증번호가 일치하지 않거나 만료되었습니다.' } },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await userEvent.type(screen.getByLabelText('인증번호'), '000000');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 확인' }));

  await waitFor(() =>
    expect(screen.getByText('인증번호가 일치하지 않거나 만료되었습니다.')).toBeInTheDocument()
  );
});

test('인증코드 발송 후 이메일을 바꾸면 인증코드 입력란이 사라진다', async () => {
  authApi.sendFindIdCode.mockResolvedValue({ success: true });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await waitFor(() => expect(screen.getByLabelText('인증번호')).toBeInTheDocument());

  await userEvent.clear(screen.getByLabelText('이메일'));
  await userEvent.type(screen.getByLabelText('이메일'), 'other@example.com');

  expect(screen.queryByLabelText('인증번호')).not.toBeInTheDocument();
});

test('회원 정보가 없는 이메일이면 서버 메시지를 보여준다', async () => {
  authApi.sendFindIdCode.mockRejectedValue({
    response: { status: 404, data: { success: false, message: '일치하는 회원 정보를 찾을 수 없습니다.' } },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'nouser@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));

  await waitFor(() =>
    expect(screen.getByText('일치하는 회원 정보를 찾을 수 없습니다.')).toBeInTheDocument()
  );
});
