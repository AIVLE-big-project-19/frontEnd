import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MyPage from './MyPage';
import { getMyProfile, getMyBoards, getMyConsents, updateMarketingConsent } from '../api/myPageApi';

vi.mock('../api/myPageApi');
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const mockLogout = vi.fn();
const mockClearLocalSession = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout, clearLocalSession: mockClearLocalSession }),
}));

const renderMyPage = () =>
  render(
    <MemoryRouter>
      <MyPage />
    </MemoryRouter>
  );

const baseProfile = {
  loginId: 'tester01', email: 'user@example.com', name: '홍길동',
  provider: 'LOCAL', createdAt: '2026-01-01T00:00:00',
};

const baseConsents = [
  { type: 'TERMS', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
  { type: 'PRIVACY', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
  { type: 'MARKETING', agreed: false, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
];

beforeEach(() => {
  vi.clearAllMocks();
  getMyBoards.mockResolvedValue([]);
});

test('약관 동의 현황 3개 항목을 표시한다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  renderMyPage();

  await waitFor(() => expect(screen.getByText('약관 동의 현황')).toBeInTheDocument());
  expect(screen.getByText('이용약관')).toBeInTheDocument();
  expect(screen.getByText('개인정보 수집·이용')).toBeInTheDocument();
  expect(screen.getByText('마케팅 정보 수신')).toBeInTheDocument();
  expect(screen.getAllByText('동의함')).toHaveLength(2);
});

test('동의 기록이 null이면 동의 기록 없음을 표시한다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue([
    { type: 'TERMS', agreed: null, version: null, agreedAt: null },
    { type: 'PRIVACY', agreed: null, version: null, agreedAt: null },
    { type: 'MARKETING', agreed: null, version: null, agreedAt: null },
  ]);
  renderMyPage();

  await waitFor(() => expect(screen.getAllByText('동의 기록 없음')).toHaveLength(3));
});

test('동의 현황 조회가 실패해도 프로필은 정상 표시된다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockRejectedValue({ response: { status: 500 } });
  renderMyPage();

  await waitFor(() => expect(screen.getByText('동의 현황을 불러오지 못했습니다.')).toBeInTheDocument());
  expect(screen.getByDisplayValue('tester01')).toBeInTheDocument();
});

test('마케팅 수신 동의 토글을 켜면 API를 호출하고 상태가 갱신된다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  updateMarketingConsent.mockResolvedValue({
    type: 'MARKETING', agreed: true, version: '1.0', agreedAt: '2026-07-17T00:00:00',
  });
  renderMyPage();

  await waitFor(() => expect(screen.getByText('마케팅 정보 수신')).toBeInTheDocument());
  const toggle = screen.getByRole('checkbox', { name: '마케팅 정보 수신 동의 토글' });
  await userEvent.click(toggle);

  await waitFor(() => expect(updateMarketingConsent).toHaveBeenCalledWith(true));
  await waitFor(() => expect(toggle).toBeChecked());
});

test('마케팅 수신 동의 토글 실패 시 원래 상태로 되돌린다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  updateMarketingConsent.mockRejectedValue({ response: { status: 500 } });
  renderMyPage();

  await waitFor(() => expect(screen.getByText('마케팅 정보 수신')).toBeInTheDocument());
  const toggle = screen.getByRole('checkbox', { name: '마케팅 정보 수신 동의 토글' });
  await userEvent.click(toggle);

  await waitFor(() =>
    expect(screen.getByText('마케팅 수신 동의 변경에 실패했습니다.')).toBeInTheDocument()
  );
  expect(toggle).not.toBeChecked();
});

test('회원탈퇴 버튼 클릭 시 확인 모달이 뜬다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  renderMyPage();

  await waitFor(() => expect(screen.getByRole('button', { name: '회원탈퇴' })).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: '회원탈퇴' }));

  expect(screen.getByPlaceholderText('현재 비밀번호')).toBeInTheDocument();
});

test('구글 계정이면 회원탈퇴 모달에 비밀번호 입력창이 없다', async () => {
  getMyProfile.mockResolvedValue({ ...baseProfile, provider: 'GOOGLE', loginId: null });
  getMyConsents.mockResolvedValue(baseConsents);
  renderMyPage();

  await waitFor(() => expect(screen.getByRole('button', { name: '회원탈퇴' })).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: '회원탈퇴' }));

  expect(screen.queryByPlaceholderText('현재 비밀번호')).not.toBeInTheDocument();
  expect(screen.getByText('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')).toBeInTheDocument();
});
