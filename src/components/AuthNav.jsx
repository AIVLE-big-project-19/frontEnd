import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthNav = () => {
  const { isLoggedIn, loginId, logout } = useAuth();

  if (isLoggedIn) {
    return (
      <nav className="nav-menu">
        <span>{loginId}님</span>
        <button type="button" onClick={logout}>로그아웃</button>
      </nav>
    );
  }

  return (
    <nav className="nav-menu">
      <Link to="/login">로그인</Link>
      <Link to="/signup">회원가입</Link>
    </nav>
  );
};

export default AuthNav;
