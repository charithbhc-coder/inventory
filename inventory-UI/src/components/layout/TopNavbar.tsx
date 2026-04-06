import { Search, Bell, Calendar, Moon, Sun, Menu, User, LogOut } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

import { useNavigate } from 'react-router-dom';

export default function TopNavbar({ isCollapsed, onToggleCollapse, onOpenMobile }: any) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Default to light mode as requested
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Desktop Toggle */}
        <button className="nav-btn desktop-toggle" onClick={onToggleCollapse}>
          <Menu size={20} />
        </button>
        {/* Mobile Toggle */}
        <button className="nav-btn mobile-toggle" onClick={onOpenMobile}>
          <Menu size={20} />
        </button>

        <div className="search-wrap" style={{ position: 'relative', width: '100%', minWidth: 280, maxWidth: 400 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search across assets..." 
            style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 50, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13, outline: 'none', transition: 'background-color 0.3s, color 0.3s, border-color 0.3s' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="nav-btn"><Bell size={18} /></button>
        <button className="nav-btn"><Calendar size={18} /></button>
        <button className="nav-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <div style={{ width: 1, height: 24, background: 'var(--border-dark)', margin: '0 8px' }} />
        
        <div 
          ref={dropdownRef}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div style={{ textAlign: 'right' }} className="profile-text">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ').toLowerCase() || 'User'}
            </div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-yellow)', color: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, overflow: 'hidden' }}>
            {user?.avatarUrl ? (
              <img 
                src={`${import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              user?.firstName && user?.lastName 
                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() 
                : '?'
            )}
          </div>

          {dropdownOpen && (
            <div style={{ 
              position: 'absolute', top: 48, right: 0, width: 200, background: 'var(--bg-card)', 
              borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--border-dark)', 
              padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 4
            }}>
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', color: 'var(--text-main)', fontSize: 13, fontWeight: 600, transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
              >
                <User size={16} /> Update Profile
              </button>
              <div style={{ height: 1, background: 'var(--border-dark)', margin: '4px 0' }} />
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', color: 'var(--accent-red)', fontSize: 13, fontWeight: 600, transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => { setDropdownOpen(false); logout(); navigate('/login'); }}
              >
                <LogOut size={16} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
