import { useCallback, useRef } from 'react';

// StrictMode는 개발 모드에서 mount effect를 두 번 실행한다. 1회용 토큰/코드를 소모하는
// effect는 두 번째 호출이 이미 소모된 값으로 실패해 첫 호출의 성공을 덮어쓸 수 있으므로,
// 최초 1회만 실행되게 막는 용도로 사용한다.
export const useRunOnce = () => {
  const hasRun = useRef(false);
  return useCallback(() => {
    if (hasRun.current) {
      return true;
    }
    hasRun.current = true;
    return false;
  }, []);
};
