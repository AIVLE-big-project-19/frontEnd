import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { consumeAuthExpiredMessage } from '../auth/tokenStorage';
import { buildGoogleAuthUrl } from '../auth/googleOAuth';
import TermsModal from '../components/TermsModal';
import '../styles/AuthPage.css';

const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState(location.state?.loginId || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openTermsType, setOpenTermsType] = useState(null);
  // sessionStorage에 남아있을 수 있는 "세션 만료" 1회성 메시지를 마운트 시 한 번만 읽고 지운다.
  const [expiredMessage] = useState(() => consumeAuthExpiredMessage());

  const infoMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await authApi.login({ loginId, password, rememberMe });
      auth.login(result.data, loginId, rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = buildGoogleAuthUrl();
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>SolarAivle</h1>
        {infoMessage && <p className="auth-info">{infoMessage}</p>}
        {!infoMessage && expiredMessage && <p className="auth-error">{expiredMessage}</p>}
        <div className="auth-field">
          <label htmlFor="loginId">아이디</label>
          <input
            id="loginId"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
            placeholder="아이디"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="비밀번호"
          />
        </div>
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          로그인 상태 유지
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          로그인
        </button>
        <div className="auth-links-row">
          <Link to="/signup">회원가입</Link>
          <span>|</span>
          <Link to="/find-id">아이디 찾기</Link>
          <span>|</span>
          <Link to="/find-password">비밀번호 찾기</Link>
        </div>
        <div className="auth-divider">또는</div>
        <button type="button" className="auth-submit auth-submit-secondary" onClick={handleGoogleLogin}>
          Google로 계속하기
        </button>
        <p className="google-consent-notice">
          구글 로그인 시{' '}
          <button type="button" className="link-button" onClick={() => setOpenTermsType('TERMS')}>
            이용약관
          </button>
          {' '}및{' '}
          <button type="button" className="link-button" onClick={() => setOpenTermsType('PRIVACY')}>
            개인정보처리방침
          </button>
          에 동의한 것으로 간주됩니다.
        </p>

        {openTermsType && (
          <TermsModal key={openTermsType} type={openTermsType} onClose={() => setOpenTermsType(null)} />
        )}
      </form>
    </div>
  );
};

export default LoginPage;
