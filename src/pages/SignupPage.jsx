import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import '../styles/AuthPage.css';

const SignupPage = () => {
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');

  const [loginIdChecked, setLoginIdChecked] = useState(false);
  const [loginIdMessage, setLoginIdMessage] = useState({ type: '', text: '' });
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const handleLoginIdChange = (e) => {
    setLoginId(e.target.value);
    setLoginIdChecked(false);
    setLoginIdMessage({ type: '', text: '' });
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setCodeSent(false);
    setEmailVerified(false);
    setEmailMessage({ type: '', text: '' });
  };

  const handleCheckLoginId = async () => {
    if (loginId.length < 4 || loginId.length > 20) {
      setLoginIdMessage({ type: 'error', text: '아이디는 4~20자여야 합니다.' });
      return;
    }
    try {
      const result = await authApi.checkLoginId(loginId);
      if (result.data.available) {
        setLoginIdChecked(true);
        setLoginIdMessage({ type: 'info', text: '사용 가능한 아이디입니다.' });
      } else {
        setLoginIdMessage({ type: 'error', text: '이미 사용 중인 아이디입니다.' });
      }
    } catch (err) {
      setLoginIdMessage({ type: 'error', text: serverMessage(err, '중복확인에 실패했습니다.') });
    }
  };

  const handleSendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }
    try {
      await authApi.sendEmailCode(email);
      setCodeSent(true);
      setEmailMessage({ type: 'info', text: '인증코드를 발송했습니다. 메일함을 확인해주세요.' });
    } catch (err) {
      setEmailMessage({ type: 'error', text: serverMessage(err, '인증코드 발송에 실패했습니다.') });
    }
  };

  const handleVerifyCode = async () => {
    try {
      await authApi.verifyEmailCode(email, code);
      setEmailVerified(true);
      setEmailMessage({ type: 'info', text: '이메일 인증이 완료되었습니다.' });
    } catch (err) {
      setEmailMessage({ type: 'error', text: serverMessage(err, '인증 확인에 실패했습니다.') });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validLength = password.length >= 8 && password.length <= 16;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!validLength || !hasLetter || !hasDigit || !hasSpecial) {
      setFormError('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.');
      return;
    }
    if (!name) {
      setFormError('이름을 입력해주세요.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await authApi.signup({ loginId, email, password, name });
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
    } catch (err) {
      setFormError(serverMessage(err, '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordMatches = passwordConfirm.length > 0 && password === passwordConfirm;

  const canSubmit = emailVerified && loginIdChecked && !passwordMismatch && !isSubmitting;

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>SolarAivle에 오신 것을 환영합니다</h1>

        <div className="auth-field">
          <label htmlFor="signup-loginId">아이디</label>
          <div className="auth-field-row">
            <input
              id="signup-loginId"
              value={loginId}
              onChange={handleLoginIdChange}
              autoComplete="username"
              placeholder="아이디 입력 (4~20자)"
            />
            <button type="button" className="auth-sub-button" onClick={handleCheckLoginId}>
              중복확인
            </button>
          </div>
        </div>
        {loginIdMessage.text && (
          <p className={loginIdMessage.type === 'error' ? 'auth-error' : 'auth-info'}>
            {loginIdMessage.text}
          </p>
        )}

        <div className="auth-field">
          <label htmlFor="signup-email">이메일</label>
          <div className="auth-field-row">
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={emailVerified}
              autoComplete="email"
              placeholder="이메일 주소"
            />
            <button
              type="button"
              className="auth-sub-button"
              onClick={handleSendCode}
              disabled={emailVerified}
            >
              인증코드 발송
            </button>
          </div>
        </div>

        {codeSent && !emailVerified && (
          <div className="auth-field">
            <label htmlFor="signup-code">인증코드</label>
            <div className="auth-field-row">
              <input
                id="signup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="인증번호 6자리"
              />
              <button type="button" className="auth-sub-button" onClick={handleVerifyCode}>
                인증 확인
              </button>
            </div>
          </div>
        )}
        {emailMessage.text && (
          <p className={emailMessage.type === 'error' ? 'auth-error' : 'auth-info'}>
            {emailMessage.text}
          </p>
        )}

        <div className="auth-field">
          <label htmlFor="signup-password">비밀번호</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="비밀번호 입력 (8~16자리/영문 숫자 특수기호 포함)"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-passwordConfirm">비밀번호 확인</label>
          <input
            id="signup-passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="비밀번호 재입력"
          />
          {passwordMismatch && <p className="auth-error">비밀번호가 일치하지 않습니다.</p>}
          {passwordMatches && <p className="auth-info">비밀번호가 일치합니다.</p>}
        </div>

        <div className="auth-field">
          <label htmlFor="signup-name">이름</label>
          <input
            id="signup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="이름 입력"
          />
        </div>

        {formError && <p className="auth-error">{formError}</p>}
        <button className="auth-submit" type="submit" disabled={!canSubmit}>
          가입하기
        </button>
        <div className="auth-links">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </form>
    </div>
  );
};

export default SignupPage;
