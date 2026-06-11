import { createBrowserRouter, RouterProvider, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RequireAuth, RequireGuest } from './guards';

// When a lazy chunk 404s after a new deploy (content-hashed filename changed),
// reload the page instead of crashing — fresh index.html has the correct new hashes.
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((err) => {
      const isChunkMissing =
        err instanceof TypeError &&
        (err.message.includes('Failed to fetch') ||
          err.message.includes('Importing a module script failed') ||
          err.message.includes('dynamically imported module'));
      if (isChunkMissing) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    })
  );
}

import LoginPage from '@/features/auth/LoginPage';
const ForgotPassword   = lazyWithRetry(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPassword    = lazyWithRetry(() => import('@/features/auth/ResetPasswordPage'));
const ChangePassword   = lazyWithRetry(() => import('@/features/auth/ChangePasswordPage'));
import DashboardPage    from '@/features/dashboard/DashboardPage';
import CompaniesPage    from '@/features/companies/CompaniesPage';
import CompanyDetailPage from '@/features/companies/CompanyDetailPage';
import UsersPage        from '@/features/users/UsersPage';
import AdminLayout      from '@/components/layout/AdminLayout';
const SettingsPage     = lazyWithRetry(() => import('@/features/settings/SettingsPage'));
const ReportsPage      = lazyWithRetry(() => import('@/features/reports/ReportsPage'));
import DepartmentsPage  from '@/features/departments/DepartmentsPage';
import ItemsPage        from '@/features/items/ItemsPage';
const ItemDeepLinkPage = lazyWithRetry(() => import('@/features/items/ItemDeepLinkPage'));
import CategoriesPage   from '@/features/categories/CategoriesPage';
const ProfilePage      = lazyWithRetry(() => import('@/features/profile/ProfilePage'));
const AuditLogsPage    = lazyWithRetry(() => import('@/features/audit-logs/AuditLogsPage'));
import LicensesPage     from '@/features/licenses/LicensesPage';
const EmployeesPage    = lazyWithRetry(() => import('@/features/employees/EmployeesPage'));
const DisposalRequestsPage = lazyWithRetry(() => import('@/features/disposal-requests/DisposalRequestsPage'));
const GatePassesPage = lazyWithRetry(() => import('@/features/gate-passes/GatePassesPage'));
const TransfersPage = lazyWithRetry(() => import('@/features/transfers/TransfersPage'));


// Backward-compat: older notification emails linked to /disposal-requests/:id
// (a path that never had a route, so it fell through to the dashboard). Forward
// those legacy links to the canonical deep-link that opens the request drawer.
function LegacyDisposalRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/disposals?open=${id}`} replace />;
}

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
          { path: '/items/:id',  element: <ItemDeepLinkPage /> },
          { path: '/categories',  element: <CategoriesPage /> },
          { path: '/licenses',    element: <LicensesPage /> },
          { path: '/employees',   element: <EmployeesPage /> },
          { path: '/disposals',   element: <DisposalRequestsPage /> },
          { path: '/disposal-requests/:id', element: <LegacyDisposalRedirect /> },
          { path: '/gate-passes', element: <GatePassesPage /> },
          { path: '/transfers',   element: <TransfersPage /> },
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
