import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BoardListPage from './pages/BoardListPage';
import BoardDetailPage from './pages/BoardDetailPage';
import BoardWritePage from './pages/BoardWritePage';
import TestPage from './pages/TestPage';
import BoardEditPage from './pages/BoardEditPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/boards" element={<BoardListPage />} />
    <Route path="/boards/write" element={<BoardWritePage />} />
    <Route path="/boards/:boardId" element={<BoardDetailPage />} />
    <Route path="/test" element={<TestPage />} />
    <Route path="/boards/:boardId/edit" element={<BoardEditPage />} />
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
