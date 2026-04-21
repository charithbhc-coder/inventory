import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export function RequireAuth() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Save the attempted path so login can redirect back after success
    sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

export function RequireGuest() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && !user?.mustChangePassword) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
