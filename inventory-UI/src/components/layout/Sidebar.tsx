import { NavLink } from 'react-router-dom';
import logo from '@/assets/logo-sidebar.png';
import { 
  LayoutDashboard, 
  Building2, 
  Network, 
  Users, 
  PackageSearch,
  Tag,
  BarChart3,
  ListTodo,
  Settings,
  X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings.service';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';

const MENU_ITEMS = [
  { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard }, // Dashboard usually visible to all
  { path: '/companies', label: 'COMPANIES', icon: Building2, permission: AdminPermission.VIEW_COMPANIES },
  { path: '/departments', label: 'DEPARTMENTS', icon: Network, permission: AdminPermission.VIEW_DEPARTMENTS },
  { path: '/categories', label: 'CATEGORIES', icon: Tag, permission: AdminPermission.VIEW_CATEGORIES },
  { path: '/items', label: 'ITEMS', icon: PackageSearch, permission: AdminPermission.VIEW_ITEMS },
  { path: '/users', label: 'USERS', icon: Users, permission: AdminPermission.VIEW_USERS },
  { path: '/reports', label: 'REPORTS', icon: BarChart3, permission: AdminPermission.VIEW_REPORTS },
  { path: '/logs', label: 'AUDIT LOGS', icon: ListTodo, permission: AdminPermission.VIEW_AUDIT_LOGS },
];

const FOOTER_ITEMS = [
  { path: '/settings', label: 'SETTINGS', icon: Settings, permission: AdminPermission.VIEW_SETTINGS },
];


export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }: any) {
  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings,
  });

  const { hasPermission } = useAuthStore();

  const systemName = settings.find(s => s.key === 'system_name')?.value || 'KTMG-VAULT';
  const sidebarClass = `admin-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`;
  
  return (
    <aside className={sidebarClass}>
      <div style={{ padding: isCollapsed ? '24px 0' : '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 80 }}>
        <NavLink 
          to="/dashboard" 
          onClick={onCloseMobile}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            justifyContent: 'center', 
            width: isCollapsed ? '100%' : 'auto',
            textDecoration: 'none',
            cursor: 'pointer'
          }}
        >
          <img src={logo} alt="Logo" style={{ height: 48, width: 48, objectFit: 'contain' }} />
          {!isCollapsed && <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '1px', margin: 0, color: 'var(--accent-yellow)' }}>{systemName}</h1>}
        </NavLink>
        
        {/* Mobile close button inside sidebar */}
        <button className="nav-btn mobile-toggle" onClick={onCloseMobile} style={{ display: isMobileOpen ? 'flex' : 'none' }}>
          <X size={20} />
        </button>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: isCollapsed ? '0 12px' : '0 16px', marginTop: 12 }}>
        {MENU_ITEMS.filter(item => !item.permission || hasPermission(item.permission)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
            onClick={onCloseMobile}
          >
            <item.icon size={isCollapsed ? 28 : 20} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: isCollapsed ? '16px 12px' : '16px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-dark)' }}>
        {FOOTER_ITEMS.filter(item => !item.permission || hasPermission(item.permission)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
            onClick={onCloseMobile}
          >
            <item.icon size={isCollapsed ? 30 : 20} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>}
          </NavLink>
        ))}
        
        <div style={{ 
          marginTop: 24, 
          padding: isCollapsed ? '12px 0' : '16px 20px', 
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16, 
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {isCollapsed ? (
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-yellow)', textShadow: '0 0 10px rgba(255, 240, 31, 0.5)' }}>V1.2</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>System Version</span>
                <div style={{ 
                  background: 'linear-gradient(135deg, #fff01f 0%, #e6d81c 100%)',
                  padding: '4px 12px',
                  borderRadius: 50,
                  fontSize: 11,
                  fontWeight: 900,
                  color: '#111',
                  boxShadow: '0 0 15px rgba(255, 240, 31, 0.4)',
                  border: '1px solid rgba(255, 240, 31, 0.3)'
                }}>
                  V1.2.5
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
