import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import instance from '../api/axiosInstance';

const AuthNav = () => {
  const { isLoggedIn, loginId, isAdmin, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleAdminTestLogin = async () => {
    try {
      const { data } = await instance.post('/auth/test-login/admin');

      login(data, 'admin', true);
      alert('관리자 테스트 로그인 성공!');
    } catch (error) {
      console.error('테스트 로그인 실패:', error);
      alert('오류가 발생했습니다.');
    }
  };

  if (isLoggedIn) {
    return (
      <nav className="nav-menu auth-nav">
        <NotificationBell />
        <Link to="/mypage" className="auth-user">{loginId}님</Link>
        {isAdmin && <Link to="/admin/users">회원 관리</Link>}
        {isAdmin && <Link to="/admin/idle-lands">유휴부지 관리</Link>}
        {isAdmin && <Link to="/admin/analysis-logs">전체 분석 로그</Link>}
        <button type="button" onClick={handleLogout}>로그아웃</button>
      </nav>
    );
  }

  return (
    <nav className="nav-menu auth-nav">
      <button
        type="button"
        onClick={handleAdminTestLogin}
        style={{ background: 'none', border: '1px solid #ccc', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px' }}
      >
        테스트용 관리자 로그인
      </button>
      <Link to="/login">로그인</Link>
      <Link to="/signup">회원가입</Link>
    </nav>
  );
};

export default AuthNav;
