import { useEffect, useState } from 'react';
import { getTerms } from '../api/termsApi';

export const useTerms = (type) => {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    if (!type) {
      setState({ status: 'invalid', data: null });
      return undefined;
    }
    let ignore = false;
    setState({ status: 'loading', data: null });
    getTerms(type)
      .then((terms) => {
        if (!ignore) setState({ status: 'success', data: terms });
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error', data: null });
      });
    return () => {
      ignore = true;
    };
  }, [type]);

  return state;
};
