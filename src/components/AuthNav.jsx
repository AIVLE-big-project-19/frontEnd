import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthNav = () => {
  const { isLoggedIn, loginId, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (isLoggedIn) {
    return (
      <nav className="nav-menu auth-nav">
        <Link to="/mypage" className="auth-user">{loginId}님</Link>
        <button type="button" onClick={handleLogout}>로그아웃</button>
      </nav>
    );
  }

  return (
    <nav className="nav-menu auth-nav">
      <Link to="/login">로그인</Link>
      <Link to="/signup">회원가입</Link>
    </nav>
  );
};

export default AuthNav;
