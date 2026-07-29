import { Link, useLocation } from 'react-router-dom';
import AuthNav from './AuthNav';
import solarAivleLogo from '../assets/solar-aivle-logo.png';

const Header = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

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
      <div className="header-topbar">
        <Link className="logo-link" to="/" aria-label="SolarAivle 홈으로 이동" onClick={refreshIfCurrent('/')}>
          <span className="logo-mark"><img className="logo-image" src={solarAivleLogo} alt="" /></span>
          <span className="logo-word"><span>Solar</span><b>Aivle</b></span>
        </Link>
        <AuthNav />
      </div>
      <nav className="nav-menu">
        <Link to="/" onClick={refreshIfCurrent('/')}>
          {isHome && <span className="nav-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 10.8 9-7 9 7" /><path d="M5.5 9.5V21h13V9.5M9 21v-6h6v6" /></svg></span>}
          <span>홈</span>
          {isHome && <><small className="nav-card-description">SolarAivle 서비스 소개</small><span className="nav-hover-panel"><strong>홈</strong><small>태양광 후보지 분석 서비스</small></span></>}
        </Link>
        <Link to="/boards?category=공지사항" onClick={refreshIfCurrent('/boards?category=공지사항')}>
          {isHome && <span className="nav-card-icon nav-board-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 9h7M8.5 13h7M8.5 17h7" /></svg></span>}
          <span>게시판</span>
          {isHome && <><small className="nav-card-description">공지사항과 커뮤니티</small><span className="nav-hover-panel"><strong>게시판</strong><small>서비스 관련<br />공지사항과 커뮤니티</small></span></>}
        </Link>
        <Link to="/dashboard">
          {isHome && <span className="nav-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg></span>}
          <span>통합 대시보드</span>
          {isHome && <><small className="nav-card-description">후보지 분석과 비교</small><span className="nav-hover-panel"><strong>통합 대시보드</strong><small>후보지의 적합도와 수익성을<br />분석 및 비교</small></span></>}
        </Link>
        <a href="#vision-ai" onClick={refreshHashIfCurrent('#vision-ai')}>
          {isHome && <span className="nav-card-icon nav-vision-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></svg></span>}
          <span>Vision AI 분석</span>
          {isHome && <><small className="nav-card-description">이미지 기반 태양광 분석</small><span className="nav-hover-panel"><strong>Vision AI 분석</strong><small>위성·이미지 데이터를<br />활용한 후보지 분석</small></span></>}
        </a>
      </nav>
    </header>
  );
};

export default Header;
