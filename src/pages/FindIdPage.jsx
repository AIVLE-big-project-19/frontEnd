import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { useCountdown } from '../hooks/useCountdown';
import '../styles/AuthPage.css';

const CODE_DURATION_SECONDS = 300;

const FindIdPage = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const countdown = useCountdown(CODE_DURATION_SECONDS);
  const navigate = useNavigate();

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setCodeSent(false);
    setVerified(false);
    setResult(null);
    setMessage({ type: '', text: '' });
    countdown.stop();
  };

  const handleSendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }
    try {
      await authApi.sendFindIdCode(email);
      setCodeSent(true);
      setVerified(false);
      setResult(null);
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
      const response = await authApi.verifyFindIdCode(email, code);
      setVerified(true);
      setResult(response.data);
      countdown.stop();
      setMessage({ type: 'info', text: '인증이 완료되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: serverMessage(err, '인증 확인에 실패했습니다.') });
    }
  };

  const handleFindId = () => {
    navigate('/show-id', { state: result });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>SolarAivle ID 찾기</h1>

        <div className="auth-field">
          <label htmlFor="find-id-email">이메일</label>
          <div className="auth-field-row">
            <input
              id="find-id-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={verified}
              placeholder="이메일 주소를 입력해주세요"
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
            <label htmlFor="find-id-code">인증번호</label>
            <div className="auth-field-row">
              <input
                id="find-id-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="인증번호 입력"
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

        <button type="button" className="auth-submit" disabled={!verified} onClick={handleFindId}>
          아이디 찾기
        </button>

        <div className="auth-links">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default FindIdPage;
