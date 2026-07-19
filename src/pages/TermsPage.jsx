import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Layout from '../components/Layout';
import { getTerms } from '../api/termsApi';
import '../styles/AuthPage.css';

const TITLES = { terms: '이용약관', privacy: '개인정보처리방침' };
const TYPE_MAP = { terms: 'TERMS', privacy: 'PRIVACY' };

const TermsPage = () => {
  const { type } = useParams();
  const apiType = TYPE_MAP[type];
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    if (!apiType) {
      setState({ status: 'invalid', data: null });
      return;
    }
    let ignore = false;
    setState({ status: 'loading', data: null });
    getTerms(apiType)
      .then((terms) => {
        if (!ignore) setState({ status: 'success', data: terms });
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error', data: null });
      });
    return () => {
      ignore = true;
    };
  }, [apiType]);

  return (
    <Layout>
      <div className="auth-page terms-page">
        <div className="auth-card terms-card">
          <h1>{TITLES[type] || '약관'}</h1>
          {state.status === 'loading' && <p className="auth-subtitle">약관을 불러오는 중...</p>}
          {(state.status === 'error' || state.status === 'invalid') && (
            <>
              <p className="auth-error">약관을 찾을 수 없습니다.</p>
              <div className="auth-links">
                <Link to="/">홈으로 돌아가기</Link>
              </div>
            </>
          )}
          {state.status === 'success' && (
            <>
              <p className="terms-version">버전 {state.data.version}</p>
              <div className="terms-content">
                <ReactMarkdown>{state.data.content}</ReactMarkdown>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TermsPage;
