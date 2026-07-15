import { renderHook, act } from '@testing-library/react';
import { useCountdown, formatCountdown } from './useCountdown';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('formatCountdown은 mm:ss 형식으로 변환한다', () => {
  expect(formatCountdown(300)).toBe('5:00');
  expect(formatCountdown(59)).toBe('0:59');
  expect(formatCountdown(0)).toBe('0:00');
});

test('start 호출 시 지정한 시간부터 카운트다운을 시작한다', () => {
  const { result } = renderHook(() => useCountdown(300));
  act(() => {
    result.current.start();
  });
  expect(result.current.secondsLeft).toBe(300);
  expect(result.current.isRunning).toBe(true);

  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(result.current.secondsLeft).toBe(299);
});

test('시간이 0이 되면 만료 상태가 된다', () => {
  const { result } = renderHook(() => useCountdown(2));
  act(() => {
    result.current.start();
  });
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(result.current.secondsLeft).toBe(0);
  expect(result.current.isRunning).toBe(false);
  expect(result.current.isExpired).toBe(true);
});

test('start를 다시 호출하면 타이머가 재시작된다', () => {
  const { result } = renderHook(() => useCountdown(300));
  act(() => {
    result.current.start();
  });
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(result.current.secondsLeft).toBe(295);

  act(() => {
    result.current.start();
  });
  expect(result.current.secondsLeft).toBe(300);
});

test('start를 호출하기 전에는 isExpired가 false이다', () => {
  const { result } = renderHook(() => useCountdown(300));
  expect(result.current.isExpired).toBe(false);
});

test('완료 전에 stop을 호출하면 isExpired는 false로 유지된다', () => {
  const { result } = renderHook(() => useCountdown(300));
  act(() => {
    result.current.start();
  });
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  act(() => {
    result.current.stop();
  });
  expect(result.current.isRunning).toBe(false);
  expect(result.current.isExpired).toBe(false);
});

test('stop을 호출하면 타이머가 멈춘다', () => {
  const { result } = renderHook(() => useCountdown(300));
  act(() => {
    result.current.start();
  });
  act(() => {
    result.current.stop();
  });
  expect(result.current.isRunning).toBe(false);

  const secondsAfterStop = result.current.secondsLeft;
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(result.current.secondsLeft).toBe(secondsAfterStop);
});
