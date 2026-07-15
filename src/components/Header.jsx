import { Link } from 'react-router-dom';
import AuthNav from './AuthNav';

const Header = () => (
  <header>
    <div className="logo">SolarAivle</div>
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