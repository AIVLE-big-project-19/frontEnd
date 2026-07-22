import { vi } from 'vitest';
import { showErrorToast, subscribeToErrorToast } from './errorToastStore';

test('subscribeToErrorToast로 등록한 콜백이 showErrorToast 호출 시 메시지를 받는다', () => {
  const callback = vi.fn();
  const unsubscribe = subscribeToErrorToast(callback);

  showErrorToast('에러 발생');

  expect(callback).toHaveBeenCalledWith('에러 발생');
  unsubscribe();
});

test('구독 해제 후에는 콜백이 호출되지 않는다', () => {
  const callback = vi.fn();
  const unsubscribe = subscribeToErrorToast(callback);
  unsubscribe();

  showErrorToast('에러 발생');

  expect(callback).not.toHaveBeenCalled();
});

test('구독자가 없을 때 showErrorToast를 호출해도 에러가 나지 않는다', () => {
  expect(() => showErrorToast('메시지')).not.toThrow();
});

test('이전 구독자의 unsubscribe를 나중에 호출해도 이후 구독자에게는 영향이 없다', () => {
  const callbackA = vi.fn();
  const callbackB = vi.fn();

  const unsubscribeA = subscribeToErrorToast(callbackA);
  subscribeToErrorToast(callbackB); // A를 대체함 (싱글 슬롯 설계)

  unsubscribeA(); // A의 구독 해제 함수를 뒤늦게 호출 — 이미 B로 대체된 상태이므로 아무 효과 없어야 함

  showErrorToast('에러 발생');

  expect(callbackA).not.toHaveBeenCalled();
  expect(callbackB).toHaveBeenCalledWith('에러 발생');
});
