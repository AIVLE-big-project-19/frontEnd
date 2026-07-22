import { vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorToast from './ErrorToast';
import { showErrorToast } from '../notifications/errorToastStore';

afterEach(() => {
  vi.useRealTimers();
});

test('showErrorToast 호출 시 메시지를 표시한다', () => {
  render(<ErrorToast />);

  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });

  expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();
});

test('4초 후 자동으로 사라진다', () => {
  vi.useFakeTimers();
  render(<ErrorToast />);

  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });
  expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();
});

test('X 버튼 클릭 시 즉시 닫힌다', async () => {
  render(<ErrorToast />);
  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });

  await userEvent.click(screen.getByRole('button', { name: '닫기' }));

  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();
});

test('수동으로 닫은 후 자동 닫힘 타이머가 늦게 실행돼도 재표시되지 않는다', () => {
  vi.useFakeTimers();
  render(<ErrorToast />);
  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });
  expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  });
  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();
});

test('새 에러가 오면 이전 메시지를 새 메시지로 덮어쓴다', () => {
  render(<ErrorToast />);
  act(() => {
    showErrorToast('첫 번째 에러');
  });
  expect(screen.getByText('첫 번째 에러')).toBeInTheDocument();

  act(() => {
    showErrorToast('두 번째 에러');
  });

  expect(screen.queryByText('첫 번째 에러')).not.toBeInTheDocument();
  expect(screen.getByText('두 번째 에러')).toBeInTheDocument();
});
