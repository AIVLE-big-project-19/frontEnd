import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import WithdrawalModal from './WithdrawalModal';
import * as myPageApi from '../api/myPageApi';
import * as authApi from '../api/authApi';

vi.mock('../api/myPageApi');
vi.mock('../api/authApi');

const mockClearLocalSession = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ clearLocalSession: mockClearLocalSession }),
}));

const LoginPageProbe = () => {
  const location = useLocation();
  return (
    <div>
      로그인페이지
      {location.state?.message && <p>{location.state.message}</p>}
    </div>
  );
};

const renderModal = (provider, onClose) =>
  render(
    <MemoryRouter initialEntries={['/mypage']}>
      <Routes>
        <Route path="/mypage" element={<WithdrawalModal provider={provider} onClose={onClose} />} />
        <Route path="/login" element={<LoginPageProbe />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('LOCAL 계정은 비밀번호 입력창을 보여주고, 비어있으면 탈퇴하기 버튼이 비활성화된다', () => {
  renderModal('LOCAL', vi.fn());
  expect(screen.getByPlaceholderText('현재 비밀번호')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeDisabled();
});

test('GOOGLE 계정은 비밀번호 입력창 없이 확인 문구만 보여준다', () => {
  renderModal('GOOGLE', vi.fn());
  expect(screen.queryByPlaceholderText('현재 비밀번호')).not.toBeInTheDocument();
  expect(screen.getByText('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeEnabled();
});

test('LOCAL 계정 탈퇴 성공 시 서버 로그아웃 없이 로컬 세션만 정리하고 로그인 페이지로 이동한다', async () => {
  myPageApi.withdraw.mockResolvedValue({ success: true });
  renderModal('LOCAL', vi.fn());

  await userEvent.type(screen.getByPlaceholderText('현재 비밀번호'), 'currentPassword1!');
  await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(myPageApi.withdraw).toHaveBeenCalledWith('currentPassword1!');
  expect(mockClearLocalSession).toHaveBeenCalled();
  expect(authApi.logout).not.toHaveBeenCalled();
  expect(screen.getByText('회원탈퇴가 완료되었습니다.')).toBeInTheDocument();
});

test('GOOGLE 계정 탈퇴 성공 시 withdraw가 인자 없이 호출된다', async () => {
  myPageApi.withdraw.mockResolvedValue({ success: true });
  renderModal('GOOGLE', vi.fn());

  await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(myPageApi.withdraw).toHaveBeenCalledWith(undefined);
  expect(mockClearLocalSession).toHaveBeenCalled();
});

test('탈퇴 실패(401) 시 에러 메시지를 보여주고 모달은 유지된다', async () => {
  myPageApi.withdraw.mockRejectedValue({
    response: { status: 401, data: { success: false, message: '비밀번호가 일치하지 않습니다.' } },
  });
  renderModal('LOCAL', vi.fn());

  await userEvent.type(screen.getByPlaceholderText('현재 비밀번호'), 'wrongpassword1!');
  await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument());
  expect(screen.getByPlaceholderText('현재 비밀번호')).toBeInTheDocument();
  expect(mockClearLocalSession).not.toHaveBeenCalled();
});

test('취소 버튼 클릭 시 onClose가 호출된다', async () => {
  const onClose = vi.fn();
  renderModal('GOOGLE', onClose);

  await userEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('오버레이 클릭 시 onClose가 호출된다', async () => {
  const onClose = vi.fn();
  const { container } = renderModal('GOOGLE', onClose);

  await userEvent.click(container.querySelector('.modal-overlay'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
