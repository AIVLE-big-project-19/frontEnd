import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordRules';
import { useCountdown } from '../hooks/useCountdown';
import PasswordResetSuccessModal from '../components/PasswordResetSuccessModal';
import '../styles/AuthPage.css';

const CODE_DURATION_SECONDS = 300;

const FindPasswordPage = () => {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'code' | 'password'

  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [credentialsError, setCredentialsError] = useState('');
  const [codeMessage, setCodeMessage] = useState({ type: '', text: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const countdown = useCountdown(CODE_DURATION_SECONDS);

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const handleSendCode = async () => {
    if (!loginId) {
      setCredentialsError('아이디를 입력해주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCredentialsError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    try {
      await authApi.sendFindPasswordCode(loginId, email);
      setCredentialsError('');
      setCode('');
      setCodeMessage({ type: 'info', text: '인증코드를 발송했습니다. 메일함을 확인해주세요.' });
      countdown.start();
      setStep('code');
    } catch (err) {
      setCredentialsError(serverMessage(err, '인증코드 발송에 실패했습니다.'));
    }
  };

  const handleResendCode = async () => {
    try {
      await authApi.sendFindPasswordCode(loginId, email);
      setCode('');
      countdown.start();
      setCodeMessage({ type: 'info', text: '인증코드를 다시 발송했습니다. 메일함을 확인해주세요.' });
    } catch (err) {
      setCodeMessage({ type: 'error', text: serverMessage(err, '인증코드 발송에 실패했습니다.') });
    }
  };

  const handleVerifyCode = async () => {
    if (countdown.isExpired) {
      setCodeMessage({ type: 'error', text: '인증 시간이 만료되었습니다. 인증코드를 다시 받아주세요.' });
      return;
    }
    try {
      await authApi.verifyFindPasswordCode(loginId, email, code);
      countdown.stop();
      setStep('password');
    } catch (err) {
      setCodeMessage({ type: 'error', text: serverMessage(err, '인증 확인에 실패했습니다.') });
    }
  };

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordMatches = passwordConfirm.length > 0 && password === passwordConfirm;
  const canSubmit = passwordConfirm.length > 0 && !passwordMismatch && !isSubmitting;

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
      <div className="auth-card">
        <h1>비밀번호 찾기</h1>

        {step === 'credentials' && (
          <>
            <p className="auth-subtitle">비밀번호 찾기를 위한 SolarAivle ID를 입력해 주세요</p>

            <div className="auth-field">
              <label htmlFor="find-password-loginId">아이디</label>
              <input
                id="find-password-loginId"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="아이디 입력"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="find-password-email">이메일</label>
              <input
                id="find-password-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
              />
            </div>

            {credentialsError && <p className="auth-error">{credentialsError}</p>}

            <button type="button" className="auth-submit" onClick={handleSendCode}>
              다음
            </button>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="auth-subtitle">이메일로 받은 인증코드를 입력해 주세요</p>

            <div className="auth-field">
              <label htmlFor="find-password-code">인증코드</label>
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
                  확인
                </button>
              </div>
            </div>

            {codeMessage.text && (
              <p className={codeMessage.type === 'error' ? 'auth-error' : 'auth-info'}>
                {codeMessage.text}
              </p>
            )}

            <button
              type="button"
              className="auth-submit auth-submit-secondary"
              onClick={handleResendCode}
            >
              인증코드 재전송
            </button>
          </>
        )}

        {step === 'password' && (
          <form onSubmit={handleSubmit}>
            <p className="auth-subtitle">새로운 비밀번호로 재설정 해주세요</p>

            <div className="auth-field">
              <label htmlFor="find-password-password">새 비밀번호</label>
              <input
                id="find-password-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="비밀번호 입력(8~16자리/영문,숫자,특수기호 포함)"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="find-password-passwordConfirm">새 비밀번호 확인</label>
              <input
                id="find-password-passwordConfirm"
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
        )}

        <div className="auth-links">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default FindPasswordPage;
