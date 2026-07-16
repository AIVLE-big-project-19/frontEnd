import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Header from './Header';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, loginId: null, logout: vi.fn() }),
}));

test('로고를 누르면 홈으로 이동할 수 있다', () => {
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );

  const homeLogo = screen.getByRole('link', { name: 'SolarAivle 홈으로 이동' });
  expect(homeLogo).toHaveAttribute('href', '/');
  expect(screen.getByRole('img', { name: 'SolarAivle' })).toBeInTheDocument();
});
