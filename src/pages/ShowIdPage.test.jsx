import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ShowIdPage from './ShowIdPage';

const LoginProbe = () => {
  const location = useLocation();
  return <div>로그인페이지:{location.state?.loginId}</div>;
};

const ResetProbe = () => {
  const location = useLocation();
  return (
    <div>
      재설정페이지:{location.state?.loginId}:{String(location.state?.verified)}
    </div>
  );
};

const renderPage = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/show-id', state }]}>
      <Routes>
        <Route path="/show-id" element={<ShowIdPage />} />
        <Route path="/find-id" element={<div>아이디찾기페이지</div>} />
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/reset-password" element={<ResetProbe />} />
      </Routes>
    </MemoryRouter>
  );

test('state가 없으면 아이디 찾기 페이지로 리다이렉트한다', () => {
  renderPage(undefined);
  expect(screen.getByText('아이디찾기페이지')).toBeInTheDocument();
});

test('마스킹된 아이디와 가입일을 보여준다', () => {
  renderPage({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' });
  expect(screen.getByText(/te\*\*\*\*\*\*/)).toBeInTheDocument();
  expect(screen.getByText(/2026-01-01/)).toBeInTheDocument();
});

test('로그인하기 클릭 시 실제 loginId를 담아 로그인 페이지로 이동한다', async () => {
  renderPage({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' });
  await userEvent.click(screen.getByRole('button', { name: '로그인하기' }));
  expect(screen.getByText('로그인페이지:tester01')).toBeInTheDocument();
});

test('비밀번호 재설정 클릭 시 실제 loginId와 verified 플래그를 담아 이동한다', async () => {
  renderPage({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' });
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }));
  expect(screen.getByText('재설정페이지:tester01:true')).toBeInTheDocument();
});
