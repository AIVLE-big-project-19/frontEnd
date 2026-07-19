import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getTerms } from '../api/termsApi';
import '../styles/AuthPage.css';

const TITLES = { TERMS: '이용약관', PRIVACY: '개인정보처리방침' };

const TermsModal = ({ type, onClose }) => {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let ignore = false;
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
        <h2>{TITLES[type]}</h2>
        {state.status === 'loading' && <p>약관을 불러오는 중...</p>}
        {state.status === 'error' && <p>약관을 불러오지 못했습니다.</p>}
        {state.status === 'success' && (
          <>
            <p className="terms-version">버전 {state.data.version}</p>
            <div className="terms-content">
              <ReactMarkdown>{state.data.content}</ReactMarkdown>
            </div>
          </>
        )}
        <button type="button" className="auth-submit auth-submit-secondary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
};

export default TermsModal;
