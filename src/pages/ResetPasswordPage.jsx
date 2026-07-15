import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordRules';
import PasswordResetSuccessModal from '../components/PasswordResetSuccessModal';
import '../styles/AuthPage.css';

const ResetPasswordPage = () => {
  const location = useLocation();
  const state = location.state;
  const loginId = state?.loginId;

  const [statusChecked, setStatusChecked] = useState(false);
  const [statusVerified, setStatusVerified] = useState(false);
  const [statusCheckFailed, setStatusCheckFailed] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!loginId) {
      return undefined;
    }
    let cancelled = false;
    setStatusChecked(false);
    setStatusCheckFailed(false);
    authApi
      .getPasswordResetStatus(loginId)
      .then((response) => {
        if (!cancelled) {
          setStatusVerified(Boolean(response.data.verified));
          setStatusChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusVerified(false);
          setStatusCheckFailed(true);
          setStatusChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loginId, retryToken]);

  const handleRetryStatusCheck = () => setRetryToken((token) => token + 1);

  if (!state?.loginId || !state?.verified) {
    return <Navigate to="/find-id" replace />;
  }

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordMatches = passwordConfirm.length > 0 && password === passwordConfirm;
  const canSubmit = statusVerified && !passwordMismatch && !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      setFormError(PASSWORD_RULE_MESSAGE);
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(loginId, password);
      setResetDone(true);
    } catch (err) {
      setFormError(serverMessage(err, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetDone) {
    return <PasswordResetSuccessModal loginId={loginId} />;
  }

  if (!statusChecked) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>비밀번호 찾기</h1>
          <p>인증 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (statusCheckFailed) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>비밀번호 찾기</h1>
          <p className="auth-error">인증 상태를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <button type="button" className="auth-submit" onClick={handleRetryStatusCheck}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!statusVerified) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>비밀번호 찾기</h1>
          <p className="auth-error">인증이 만료되었습니다. 아이디 찾기를 다시 진행해주세요.</p>
          <div className="auth-links">
            <Link to="/find-id">아이디 찾기로 이동</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>비밀번호 찾기</h1>
        <p className="auth-subtitle">새로운 비밀번호로 재설정 해주세요</p>

        <div className="auth-field">
          <label htmlFor="reset-password-loginId">아이디</label>
          <input id="reset-password-loginId" value={loginId} readOnly />
        </div>

        <div className="auth-field">
          <label htmlFor="reset-password-password">새 비밀번호</label>
          <input
            id="reset-password-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="비밀번호 입력(8~16자리/영문,숫자,특수기호 포함)"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reset-password-passwordConfirm">새 비밀번호 확인</label>
          <input
            id="reset-password-passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="새 비밀번호"
          />
          {passwordMismatch && <p className="auth-error">비밀번호가 일치하지 않습니다.</p>}
          {passwordMatches && <p className="auth-info">비밀번호가 일치합니다.</p>}
        </div>

        {formError && <p className="auth-error">{formError}</p>}
        <button className="auth-submit" type="submit" disabled={!canSubmit}>
          변경하기
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
