import { useEffect, useRef, useState } from 'react';
import { subscribeToErrorToast } from '../notifications/errorToastStore';
import '../styles/ErrorToast.css';

const AUTO_DISMISS_MS = 4000;

const ErrorToast = () => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToErrorToast((text) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setMessage(text);
      timerRef.current = setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, AUTO_DISMISS_MS);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  };

  if (!message) {
    return null;
  }

  return (
    <div className="error-toast" role="alert">
      <span>{message}</span>
      <button type="button" className="error-toast-close" onClick={handleClose} aria-label="닫기">
        ×
      </button>
    </div>
  );
};

export default ErrorToast;
