import { Navigate } from 'react-router-dom';
import { User } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isLoggedIn: boolean;
  user?: User;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, isLoggedIn, user, requireAdmin = false }: ProtectedRouteProps) => {
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
