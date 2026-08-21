import Header from './Header';
import Footer from './Footer';

const Layout = ({ children, className = '' }) => (
  <div className={`app-container ${className}`.trim()}>
    <Header />
    <main className="main-content">{children}</main>
    <Footer />
  </div>
);
export default Layout;
