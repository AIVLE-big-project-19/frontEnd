import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
