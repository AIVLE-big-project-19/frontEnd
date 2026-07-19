import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

test('개인정보처리방침 링크가 /terms/privacy로 연결된다', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/terms/privacy');
});

test('이용약관 링크가 /terms/terms로 연결된다', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms/terms');
});
