import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordRules';
import { useCountdown } from '../hooks/useCountdown';
import PasswordResetSuccessModal from '../components/PasswordResetSuccessModal';
import '../styles/AuthPage.css';

const CODE_DURATION_SECONDS = 300;

const FindPasswordPage = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const countdown = useCountdown(CODE_DURATION_SECONDS);

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const resetVerification = () => {
    setCodeSent(false);
    setVerified(false);
    setMessage({ type: '', text: '' });
    countdown.stop();
  };

  const handleLoginIdChange = (e) => {
    setLoginId(e.target.value);
    resetVerification();
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    resetVerification();
  };

  const handleSendCode = async () => {
    if (!loginId) {
      setMessage({ type: 'error', text: '아이디를 입력해주세요.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }
    try {
      await authApi.sendFindPasswordCode(loginId, email);
      setCodeSent(true);
      setVerified(false);
      countdown.start();
      setMessage({ type: 'info', text: '인증코드를 발송했습니다. 메일함을 확인해주세요.' });
    } catch (err) {
      setMessage({ type: 'error', text: serverMessage(err, '인증코드 발송에 실패했습니다.') });
    }
  };

  const handleVerifyCode = async () => {
    if (countdown.isExpired) {
      setMessage({ type: 'error', text: '인증 시간이 만료되었습니다. 인증코드를 다시 받아주세요.' });
      return;
    }
    try {
      await authApi.verifyFindPasswordCode(loginId, email, code);
      setVerified(true);
      countdown.stop();
      setMessage({ type: 'info', text: '인증이 완료되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: serverMessage(err, '인증 확인에 실패했습니다.') });
    }
  };

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordMatches = passwordConfirm.length > 0 && password === passwordConfirm;
  const canSubmit = verified && !passwordMismatch && !isSubmitting;

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

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>비밀번호 찾기</h1>
        <p className="auth-subtitle">비밀번호 찾기를 위한 SolarAivle ID를 입력해 주세요</p>

        <div className="auth-field">
          <label htmlFor="find-password-loginId">아이디</label>
          <input
            id="find-password-loginId"
            value={loginId}
            onChange={handleLoginIdChange}
            placeholder="아이디 입력"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="find-password-password">비밀번호</label>
          <input
            id="find-password-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="새 비밀번호 입력"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="find-password-passwordConfirm">비밀번호 확인</label>
          <input
            id="find-password-passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="새 비밀번호 확인"
          />
          {passwordMismatch && <p className="auth-error">비밀번호가 일치하지 않습니다.</p>}
          {passwordMatches && <p className="auth-info">비밀번호가 일치합니다.</p>}
        </div>

        <div className="auth-field">
          <label htmlFor="find-password-email">이메일</label>
          <div className="auth-field-row">
            <input
              id="find-password-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={verified}
              placeholder="이메일"
            />
            <button
              type="button"
              className="auth-sub-button"
              onClick={handleSendCode}
              disabled={verified}
            >
              인증번호 받기
            </button>
          </div>
        </div>

        {codeSent && !verified && (
          <div className="auth-field">
            <label htmlFor="find-password-code">인증번호</label>
            <div className="auth-field-row">
              <input
                id="find-password-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="인증번호"
              />
              <span className="auth-countdown">{countdown.label}</span>
              <button type="button" className="auth-sub-button" onClick={handleVerifyCode}>
                인증번호 확인
              </button>
            </div>
          </div>
        )}

        {message.text && (
          <p className={message.type === 'error' ? 'auth-error' : 'auth-info'}>{message.text}</p>
        )}
        {formError && <p className="auth-error">{formError}</p>}

        <button className="auth-submit" type="submit" disabled={!canSubmit}>
          변경하기
        </button>

        <div className="auth-links">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </form>
    </div>
  );
};

export default FindPasswordPage;
