import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RequireAuth, RequireGuest } from './guards';

import LoginPage from '@/features/auth/LoginPage';
const ForgotPassword   = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPassword    = lazy(() => import('@/features/auth/ResetPasswordPage'));
const ChangePassword   = lazy(() => import('@/features/auth/ChangePasswordPage'));
import DashboardPage    from '@/features/dashboard/DashboardPage';
import CompaniesPage    from '@/features/companies/CompaniesPage';
import CompanyDetailPage from '@/features/companies/CompanyDetailPage';
import UsersPage        from '@/features/users/UsersPage';
import AdminLayout      from '@/components/layout/AdminLayout';
const SettingsPage     = lazy(() => import('@/features/settings/SettingsPage'));
const ReportsPage      = lazy(() => import('@/features/reports/ReportsPage'));
import DepartmentsPage  from '@/features/departments/DepartmentsPage';
import ItemsPage        from '@/features/items/ItemsPage';
import CategoriesPage   from '@/features/categories/CategoriesPage';
const ProfilePage      = lazy(() => import('@/features/profile/ProfilePage'));
const AuditLogsPage    = lazy(() => import('@/features/audit-logs/AuditLogsPage'));
import LicensesPage     from '@/features/licenses/LicensesPage';

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
      {
        element: <AdminLayout />,
        children: [
          { path: '/dashboard',   element: <DashboardPage /> },
          { path: '/companies',   element: <CompaniesPage /> },
          { path: '/companies/:id', element: <CompanyDetailPage /> },
          { path: '/departments', element: <DepartmentsPage /> },
          { path: '/users',       element: <UsersPage /> },
          { path: '/items',       element: <ItemsPage /> },
          { path: '/categories',  element: <CategoriesPage /> },
          { path: '/licenses',    element: <LicensesPage /> },
          { path: '/reports',     element: <ReportsPage /> },
          { path: '/logs',        element: <AuditLogsPage /> },
          { path: '/settings',    element: <SettingsPage /> },
          { path: '/profile',     element: <ProfilePage /> },
          { path: '/',            element: <Navigate to="/dashboard" replace /> }
        ]
      }
    ],
  },
  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
], { basename: '/inventory' });

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
