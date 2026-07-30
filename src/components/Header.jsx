import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthNav from './AuthNav';
import solarAivleLogo from '../assets/solar-aivle-logo.png';

const Header = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const [communityMenuLocked, setCommunityMenuLocked] = useState(false);

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

  const openCommunityMenu = () => {
    if (!communityMenuLocked) setCommunityMenuOpen(true);
  };

  const closeCommunityMenu = () => {
    setCommunityMenuOpen(false);
    setCommunityMenuLocked(false);
  };

  const lockCommunityMenuClosed = () => {
    setCommunityMenuOpen(false);
    setCommunityMenuLocked(true);
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
        <Link to="/analysis" onClick={refreshIfCurrent('/analysis')}>
          {isHome && <span className="nav-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.2 15.2 21 21" /><path d="M7.5 11.5 9.5 9l1.5 1.8L13.5 7.5" /></svg></span>}
          <span>유휴부지 분석</span>
          {isHome && <><small className="nav-card-description">SolarAivle 서비스 소개</small><span className="nav-hover-panel"><strong>유휴부지 분석</strong><small>태양광 후보지 분석 서비스</small></span></>}
        </Link>
        <div
          className={`nav-community-item${communityMenuOpen ? ' menu-open' : ''}`}
          onMouseEnter={openCommunityMenu}
          onMouseLeave={closeCommunityMenu}
          onClick={lockCommunityMenuClosed}
        >
          <Link className="nav-community-link" to="/community/notice" onClick={refreshIfCurrent('/community/notice')}>
            {isHome && <span className="nav-card-icon nav-board-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 9h7M8.5 13h7M8.5 17h7" /></svg></span>}
            <span>커뮤니티</span>
            {isHome && <><small className="nav-card-description">공지사항과 커뮤니티</small><span className="nav-hover-panel"><strong>커뮤니티</strong><small>서비스 관련<br />공지사항과 커뮤니티</small></span></>}
          </Link>
          {!isHome && <div className="community-submenu" aria-label="커뮤니티 메뉴">
            <Link to="/community/notice" onClick={refreshIfCurrent('/community/notice')}>공지사항</Link>
            <Link to="/community/faq" onClick={refreshIfCurrent('/community/faq')}>FAQ</Link>
            <Link to="/community/inquiry" onClick={refreshIfCurrent('/community/inquiry')}>1:1문의</Link>
          </div>}
        </div>
        <Link to="/dashboard">
          {isHome && <span className="nav-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg></span>}
          <span>통합 대시보드</span>
          {isHome && <><small className="nav-card-description">후보지 분석과 비교</small><span className="nav-hover-panel"><strong>통합 대시보드</strong><small>후보지의 적합도와 수익성을<br />분석 및 비교</small></span></>}
        </Link>
        <a href="/vision-ai" onClick={refreshHashIfCurrent('/vision-ai')}>
          {isHome && <span className="nav-card-icon nav-vision-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></svg></span>}
          <span>Vision AI 분석</span>
          {isHome && <><small className="nav-card-description">이미지 기반 태양광 분석</small><span className="nav-hover-panel"><strong>Vision AI 분석</strong><small>위성·이미지 데이터를<br />활용한 후보지 분석</small></span></>}
        </a>
        <Link to="/test/recommendations" onClick={refreshIfCurrent('/test/recommendations')}>
          <span>추천 테스트</span>
        </Link>
      </nav>
    </header>
  );
};

export default Header;
