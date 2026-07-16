import { Link } from 'react-router-dom';
import AuthNav from './AuthNav';
import solarAivleLogo from '../assets/solar-aivle-logo.png';

const Header = () => (
  <header>
    <Link className="logo-link" to="/" aria-label="SolarAivle 홈으로 이동">
      <img className="logo-image" src={solarAivleLogo} alt="SolarAivle" />
    </Link>
    <nav className="nav-menu">
      <Link to="/">홈</Link>
      <Link to="/boards">게시판</Link>
      <a href="#">통합 대시보드</a>
      <a href="#">시물레이션</a>
      <a href="#">Vision AI 분석</a>
    </nav>
    <AuthNav />
  </header>
);
export default Header;
