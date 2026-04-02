import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export function RequireAuth() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

export function RequireGuest() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && !user?.mustChangePassword) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
