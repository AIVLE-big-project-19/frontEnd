import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TermsModal from './TermsModal';
import * as termsApi from '../api/termsApi';

vi.mock('../api/termsApi');

beforeEach(() => {
  vi.clearAllMocks();
});

test('로딩 중에는 안내 문구를 보여준다', () => {
  termsApi.getTerms.mockReturnValue(new Promise(() => {}));
  render(<TermsModal type="TERMS" onClose={() => {}} />);
  expect(screen.getByText('약관을 불러오는 중...')).toBeInTheDocument();
});

test('조회에 성공하면 제목/버전/본문을 보여준다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '# 이용약관 내용' });
  render(<TermsModal type="TERMS" onClose={() => {}} />);

  await waitFor(() => expect(screen.getByText('버전 1.0')).toBeInTheDocument());
  expect(screen.getByRole('heading', { name: '이용약관' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '이용약관 내용', level: 1 })).toBeInTheDocument();
  expect(termsApi.getTerms).toHaveBeenCalledWith('TERMS');
});

test('조회에 실패하면 에러 메시지를 보여준다', async () => {
  termsApi.getTerms.mockRejectedValue({ response: { status: 404 } });
  render(<TermsModal type="PRIVACY" onClose={() => {}} />);

  await waitFor(() => expect(screen.getByText('약관을 불러오지 못했습니다.')).toBeInTheDocument());
  expect(screen.getByRole('heading', { name: '개인정보처리방침' })).toBeInTheDocument();
});

test('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '내용' });
  const onClose = vi.fn();
  render(<TermsModal type="TERMS" onClose={onClose} />);
  await waitFor(() => screen.getByText('버전 1.0'));

  await userEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('오버레이 클릭 시 onClose가 호출된다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '내용' });
  const onClose = vi.fn();
  const { container } = render(<TermsModal type="TERMS" onClose={onClose} />);
  await waitFor(() => screen.getByText('버전 1.0'));

  await userEvent.click(container.querySelector('.modal-overlay'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
