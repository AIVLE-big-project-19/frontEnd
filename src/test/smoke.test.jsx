import { render, screen } from '@testing-library/react';

test('테스트 환경이 동작한다', () => {
  render(<div>hello</div>);
  expect(screen.getByText('hello')).toBeInTheDocument();
});
