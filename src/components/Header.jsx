import { Link, useLocation } from 'react-router-dom';
import AuthNav from './AuthNav';
import solarAivleLogo from '../assets/solar-aivle-logo.png';

const Header = () => {
  const location = useLocation();

  const refreshIfCurrent = (target) => (event) => {
    const [pathname, search = ''] = target.split('?');
    const targetSearch = search ? `?${search}` : '';
    if (location.pathname === pathname && decodeURIComponent(location.search) === targetSearch) {
      event.preventDefault();
      window.location.reload();
    }
  };

  const refreshHashIfCurrent = (hash) => (event) => {
    if (location.hash === hash) {
      event.preventDefault();
      window.location.reload();
    }
  };

  return (
  <header>
    <Link className="logo-link" to="/" aria-label="SolarAivle 홈으로 이동" onClick={refreshIfCurrent('/')}>
      <img className="logo-image" src={solarAivleLogo} alt="SolarAivle" />
    </Link>
    <nav className="nav-menu">
      <Link to="/" onClick={refreshIfCurrent('/')}>홈</Link>
      <Link to="/boards?category=공지사항" onClick={refreshIfCurrent('/boards?category=공지사항')}>게시판</Link>
      <Link to="/dashboard" onClick={refreshIfCurrent('/dashboard')}>통합 대시보드</Link>
      <a href="#simulation" onClick={refreshHashIfCurrent('#simulation')}>시뮬레이션</a>
      <a href="#vision-ai" onClick={refreshHashIfCurrent('#vision-ai')}>Vision AI 분석</a>
    </nav>
    <AuthNav />
  </header>
  );
};
export default Header;
