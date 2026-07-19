import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TermsPage from './TermsPage';
import * as termsApi from '../api/termsApi';

vi.mock('../api/termsApi');
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/terms/:type" element={<TermsPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('terms 타입이면 TERMS로 조회해서 본문을 보여준다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '이용약관 본문' });
  renderAt('/terms/terms');

  await waitFor(() => expect(screen.getByText('이용약관 본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('TERMS');
  expect(screen.getByRole('heading', { name: '이용약관' })).toBeInTheDocument();
});

test('privacy 타입이면 PRIVACY로 조회한다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'PRIVACY', version: '1.0', content: '개인정보 본문' });
  renderAt('/terms/privacy');

  await waitFor(() => expect(screen.getByText('개인정보 본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('PRIVACY');
});

test('알 수 없는 type이면 API를 호출하지 않고 안내를 보여준다', async () => {
  renderAt('/terms/unknown');

  await waitFor(() => expect(screen.getByText('약관을 찾을 수 없습니다.')).toBeInTheDocument());
  expect(termsApi.getTerms).not.toHaveBeenCalled();
});

test('조회 실패 시 안내를 보여준다', async () => {
  termsApi.getTerms.mockRejectedValue({ response: { status: 404 } });
  renderAt('/terms/terms');

  await waitFor(() => expect(screen.getByText('약관을 찾을 수 없습니다.')).toBeInTheDocument());
});
