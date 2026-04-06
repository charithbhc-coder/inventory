import { NavLink } from 'react-router-dom';
import logo from '@/assets/logo-sidebar.png';
import { 
  LayoutDashboard, 
  Building2, 
  Network, 
  Users, 
  PackageSearch,
  BarChart3,
  ListTodo,
  Settings,
  HelpCircle,
  X
} from 'lucide-react';

const MENU_ITEMS = [
  { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { path: '/companies', label: 'COMPANIES', icon: Building2 },
  { path: '/departments', label: 'DEPARTMENTS', icon: Network },
  { path: '/users', label: 'USERS', icon: Users },
  { path: '/items', label: 'ITEMS', icon: PackageSearch },
  { path: '/reports', label: 'REPORTS', icon: BarChart3 },
  { path: '/logs', label: 'AUDIT LOGS', icon: ListTodo },
];

const FOOTER_ITEMS = [
  { path: '/settings', label: 'SETTINGS', icon: Settings },
  { path: '/support', label: 'SUPPORT', icon: HelpCircle },
];

export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }: any) {
  const sidebarClass = `admin-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`;
  
  return (
    <aside className={sidebarClass}>
      <div style={{ padding: isCollapsed ? '24px 0' : '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', width: isCollapsed ? '100%' : 'auto' }}>
          <img src={logo} alt="Logo" style={{ height: 48, width: 48, objectFit: 'contain' }} />
          {!isCollapsed && <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '1px', margin: 0, color: 'var(--accent-yellow)' }}>KTMG-VAULT</h1>}
        </div>
        
        {/* Mobile close button inside sidebar */}
        <button className="nav-btn mobile-toggle" onClick={onCloseMobile} style={{ display: isMobileOpen ? 'flex' : 'none' }}>
          <X size={20} />
        </button>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: isCollapsed ? '0 12px' : '0 16px', marginTop: 12 }}>
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
            onClick={onCloseMobile}
          >
            <item.icon size={20} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: isCollapsed ? '16px 12px' : '16px', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-dark)' }}>
        {FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
            onClick={onCloseMobile}
          >
            <item.icon size={20} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>}
          </NavLink>
        ))}
        
        <div style={{ marginTop: 24, padding: isCollapsed ? '12px 0' : '16px', background: 'var(--bg-card)', borderRadius: 12, textAlign: 'center' }}>
          {isCollapsed ? (
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>v1.0</div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>System Version</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>V1.0.0</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
