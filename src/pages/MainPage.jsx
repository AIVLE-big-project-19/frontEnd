import Layout from '../components/Layout';
import '../styles/MainPage.css';

const MainPage = () => (
  <Layout className="home-layout">
    <main className="space-hero" aria-labelledby="home-title">
      <div className="space-hero-overlay" />
      <div className="space-hero-content">
        <h1 id="home-title">SOLAR AIVLE · SOLAR SPATIAL INTELLIGENCE</h1>
      </div>
    </main>
  </Layout>
);

export default MainPage;
