import { Link } from 'react-router-dom';

const Footer = () => (
  <footer>
    <span>© SolarAivle</span>
    <nav className="footer-links">
      <Link to="/terms/terms">이용약관</Link>
      <Link to="/terms/privacy" className="footer-link-primary">개인정보처리방침</Link>
    </nav>
  </footer>
);

export default Footer;
