import { useCallback, useRef } from 'react';

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
