import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/AuthPage.css';

const formatDate = (isoString) => {
  if (!isoString) return '';
  return isoString.slice(0, 10);
};

const ShowIdPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state;

  if (!result) {
    return <Navigate to="/find-id" replace />;
  }

  const { loginId, maskedLoginId, createdAt } = result;

  const handleLogin = () => {
    navigate('/login', { state: { loginId } });
  };

  const handleResetPassword = () => {
    navigate('/reset-password', { state: { loginId, verified: true } });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>SolarAivle ID 찾기</h1>
        <p className="auth-subtitle">고객님의 정보와 일치하는 SolarAivle ID 입니다</p>

        <div className="found-id-box">
          <div>SolarAivle ID: {maskedLoginId}</div>
          <div>가입일: {formatDate(createdAt)}</div>
        </div>

        <button type="button" className="auth-submit" onClick={handleLogin}>
          로그인하기
        </button>
        <button
          type="button"
          className="auth-submit auth-submit-secondary"
          onClick={handleResetPassword}
        >
          비밀번호 재설정
        </button>

        <div className="auth-links">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default ShowIdPage;
