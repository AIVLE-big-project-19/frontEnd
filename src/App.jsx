import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FindIdPage from './pages/FindIdPage';
import ShowIdPage from './pages/ShowIdPage';
import FindPasswordPage from './pages/FindPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import TermsPage from './pages/TermsPage';
import BoardListPage from './pages/BoardListPage';
import BoardDetailPage from './pages/BoardDetailPage';
import BoardWritePage from './pages/BoardWritePage';
import TestPage from './pages/TestPage';
import BoardEditPage from './pages/BoardEditPage';
import MyPage from './pages/MyPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminUsersPage from './pages/AdminUsersPage';
import DashboardPage from './pages/DashboardPage';
import ErrorToast from './components/ErrorToast';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/find-id" element={<FindIdPage />} />
    <Route path="/show-id" element={<ShowIdPage />} />
    <Route path="/find-password" element={<FindPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
    <Route path="/terms/:type" element={<TermsPage />} />
    <Route path="/boards" element={<BoardListPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/boards/write" element={<BoardWritePage />} />
    <Route path="/boards/:boardId" element={<BoardDetailPage />} />
    <Route path="/test" element={<TestPage />} />
    <Route path="/boards/:boardId/edit" element={<BoardEditPage />} />
    <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
        </div>
        <ErrorToast />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
