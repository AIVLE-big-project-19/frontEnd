import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div className="route-loading">로그인 정보를 확인하는 중...</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
