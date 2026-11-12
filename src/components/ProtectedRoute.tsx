import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loading } from './Feedback';
import type { UserRole } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) return <Loading fullScreen text="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) {
    const dash = profile.role === 'admin' ? '/admin' : profile.role === 'farmer' ? '/farmer' : '/buyer';
    return <Navigate to={dash} replace />;
  }
  return <>{children}</>;
}
