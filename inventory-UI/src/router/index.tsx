import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RequireAuth, RequireGuest } from './guards';

const LoginPage        = lazy(() => import('@/features/auth/LoginPage'));
const ForgotPassword   = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPassword    = lazy(() => import('@/features/auth/ResetPasswordPage'));
const ChangePassword   = lazy(() => import('@/features/auth/ChangePasswordPage'));
const DashboardPage    = lazy(() => import('@/features/dashboard/DashboardPage'));

const router = createBrowserRouter([
  // Public / Guest routes
  {
    element: <RequireGuest />,
    children: [
      { path: '/login',           element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password',  element: <ResetPassword /> },
    ],
  },
  // Forced change password (authenticated but not yet changed)
  { path: '/change-password', element: <ChangePassword /> },
  // Protected app routes
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      // Phase 2+ routes added here
    ],
  },
  // Fallback
  { path: '*', element: <LoginPage /> },
]);

export default function AppRouter() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    }>
      <RouterProvider router={router} />
    </Suspense>
  );
}
