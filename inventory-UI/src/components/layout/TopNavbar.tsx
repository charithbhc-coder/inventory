import {
  Search, Bell, Moon, Sun, Menu, User, LogOut, CheckCheck,
  Package, AlertCircle, Wrench, Shield, UserPlus, X,
  Tag, Building2, Briefcase, Zap, Loader2, Camera, Key
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { searchService, GlobalSearchResult } from '@/services/search.service';

import { authService } from '@/services/auth.service';
import BarcodeScannerModal from '@/components/scanner/BarcodeScannerModal';
import logo from '@/assets/logo-sidebar.png';
import { itemService } from '@/services/item.service';
import toast from 'react-hot-toast';

export default function TopNavbar({ onToggleCollapse, onOpenMobile }: any) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'unread'>('all');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<any>(null);

  // Initialize Notification Store
  const {
    notifications,
    unreadCount,
    initialize,
    disconnect,
    markAsRead,
    markAllAsRead,
    dismiss
  } = useNotificationStore();

  useEffect(() => {
    initialize();
    return () => disconnect();
  }, [initialize, disconnect]);

  // Global Auth Sync to catch revoked permissions instantly
  const setAuth = useAuthStore(s => s.setAuth);
  useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const response = await authService.getMe();
        const refreshedUser = response?.user || response;
        if (refreshedUser && refreshedUser.id) {
          const activeUser = refreshedUser;
          setAuth(activeUser, useAuthStore.getState().accessToken!, useAuthStore.getState().refreshToken!);
          return refreshedUser;
        }
        return null;
      } catch (err) {
        return null;
      }
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    // Default to light mode as requested
    document.documentElement.setAttribute('data-theme', theme);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Search Logic
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchService.globalSearch(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const handleResultClick = (result: GlobalSearchResult) => {
    setShowSearchResults(false);
    setSearchQuery('');

    // Logic for deep linking / specific filtered view
    if (result.type === 'ITEM') {
      navigate(`/items?search=${encodeURIComponent(result.metadata.barcode)}&open=${result.id}`);
    } else if (result.type === 'USER') {
      navigate(`/users?search=${encodeURIComponent(result.metadata.email)}`);
    } else if (result.type === 'DEPARTMENT') {
      navigate(`/departments?search=${encodeURIComponent(result.metadata.code)}`);
    } else if (result.type === 'COMPANY') {
      navigate(`/companies?search=${encodeURIComponent(result.metadata.code)}`);
    } else if (result.type === 'CATEGORY') {
      navigate(`/categories?search=${encodeURIComponent(result.metadata.code)}`);
    } else if (result.type === 'LICENSE') {
      navigate(`/licenses?search=${encodeURIComponent(result.title)}`);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'ITEM': return <Package size={14} />;
      case 'USER': return <User size={14} />;
      case 'DEPARTMENT': return <Building2 size={14} />;
      case 'COMPANY': return <Briefcase size={14} />;
      case 'CATEGORY': return <Tag size={14} />;
      case 'LICENSE': return <Key size={14} />;
      default: return <Zap size={14} />;
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const getNotifUI = (n: any) => {
    switch (n.priority) {
      case 'HIGH':
        switch (n.type) {
          case 'ITEM_LOST':
          case 'ITEM_DISPOSED':
            return { icon: <AlertCircle size={14} color="#ef4444" />, bg: 'rgba(239, 68, 68, 0.1)' };
          case 'LICENSE_EXPIRING':
          case 'LICENSE_EXPIRED':
            return { icon: <Key size={14} color="#ef4444" />, bg: 'rgba(239, 68, 68, 0.1)' };
          case 'ACCOUNT_PERMISSIONS_UPDATED':
          case 'ACCOUNT_ROLE_UPDATED':
            return { icon: <Shield size={14} color="#ef4444" />, bg: 'rgba(239, 68, 68, 0.1)' };
          default:
            return { icon: <Bell size={14} color="#ef4444" />, bg: 'rgba(239, 68, 68, 0.1)' };
        }
      case 'LOW':
        if (n.type.includes('LICENSE')) return { icon: <Key size={14} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.1)' };
        return { icon: <Package size={14} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.1)' };
      case 'MEDIUM':
      default:
        if (n.type.includes('REPAIR')) return { icon: <Wrench size={14} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.1)' };
        if (n.type.includes('ASSIGN')) return { icon: <UserPlus size={14} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.1)' };
        if (n.type.includes('LICENSE')) return { icon: <Key size={14} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.1)' };
        return { icon: <Bell size={14} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.1)' };
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'high') return n.priority === 'HIGH';
    if (activeTab === 'unread') return !n.isRead;
    return true; // all
  }).slice(0, 5); // Only show top 5 locally

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

        {/* Mobile Logo */}
        <div className="hidden-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Logo" style={{ height: 32, width: 32, objectFit: 'contain' }} />
        </div>

        <div className="search-wrap" ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} />
          <input
            type="text"
            placeholder="Search..."
            className="nav-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            style={{ width: '100%', paddingLeft: 40, paddingRight: 40 }}
          />
          {isSearching && (
            <Loader2 size={16} className="spin" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          )}

          {showSearchResults && (
            <div className="premium-glass-card" style={{
              position: 'absolute', top: 48, left: 0, right: 0,
              maxHeight: 400, overflowY: 'auto', zIndex: 999,
              padding: '8px', border: '1px solid var(--border-dark)',
              boxShadow: '0 15px 35px rgba(0,0,0,0.2)', background: 'var(--bg-card)'
            }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No matches found for "{searchQuery}"
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ padding: '4px 8px 8px', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Matching Results
                  </div>
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        borderRadius: 8, background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(255, 240, 31, 0.05)',
                        color: 'var(--accent-yellow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {getResultIcon(result.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {result.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {result.subtitle}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mobile Scanner Trigger */}
        <button
          className="nav-btn hidden-desktop"
          onClick={() => setIsScannerOpen(true)}
          style={{
            background: 'var(--bg-card)', border: 'none',
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--accent-yellow)', padding: '6px'
          }}
          title="Scan physical asset barcode"
        >
          <Camera size={18} />
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="nav-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2, width: 14, height: 14,
                background: 'var(--accent-red)', borderRadius: '50%', color: '#fff',
                fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(220, 38, 38, 0.5)', border: '2px solid var(--bg-card)'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="premium-glass-card notification-dropdown" style={{
              position: 'absolute', top: 48, right: 0, width: 320, padding: 0,
              zIndex: 9999, border: '1px solid var(--border-dark)', background: 'var(--bg-card)',
              overflow: 'hidden', boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-dark)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>System Notifications</span>
                  <button
                    onClick={() => markAllAsRead()}
                    style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                </div>

                {/* Priority Tabs */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['all', 'high', 'unread'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: activeTab === tab ? 'var(--text-main)' : 'var(--bg-dark)',
                        color: activeTab === tab ? 'var(--bg-card)' : 'var(--text-muted)',
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {filteredNotifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    <Bell size={32} style={{ marginBottom: 12, opacity: 0.2, margin: '0 auto' }} />
                    No notifications
                  </div>
                ) : (
                  filteredNotifications.map((n: any) => {
                    const ui = getNotifUI(n);
                    return (
                      <div
                        key={n.id}
                        style={{
                          padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: n.isRead ? 'transparent' : 'rgba(255, 240, 31, 0.03)',
                          transition: 'background 0.2s', position: 'relative'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(255, 240, 31, 0.03)'}
                      >
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: ui.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {ui.icon}
                          </div>
                          <div
                            style={{ flex: 1, cursor: n.actionUrl ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (!n.isRead) markAsRead(n.id);
                              if (n.actionUrl) {
                                setNotifOpen(false);
                                navigate(n.actionUrl);
                              }
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, color: n.isRead ? 'var(--text-muted)' : 'var(--text-main)', marginBottom: 2, paddingRight: 20 }}>{n.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 6 }}>{n.message}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{formatDistanceToNow(new Date(n.createdAt))} ago</div>
                          </div>

                          {/* Dismiss Button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                            style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-muted)', padding: 4, borderRadius: '50%' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,0,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            title="Dismiss notification"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <button
                onClick={() => { setNotifOpen(false); navigate('/logs'); }}
                style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', borderTop: '1px solid var(--border-dark)', background: 'rgba(255,255,255,0.02)' }}
              >
                View all activity
              </button>
            </div>
          )}
        </div>

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
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ').toLowerCase() || 'User'}
            </div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-yellow)', color: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, overflow: 'hidden' }}>
            {user?.avatarUrl ? (
              <img
                src={`${import.meta.env.VITE_API_BASE_URL}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}t=${new Date(user.updatedAt || 0).getTime()}`}
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
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={async (scanned) => {
          setIsScannerOpen(false);
          const value = scanned.trim();

          // QR deep-link: extract item ID from URL and navigate directly
          const deepLinkMatch = value.match(/\/items\/([0-9a-f-]{36})/i);
          if (deepLinkMatch) {
            navigate(`/items/${deepLinkMatch[1]}`);
            return;
          }

          // Plain barcode: search by barcode value
          try {
            const response = await itemService.getItems({ barcode: value, limit: 1 });
            const items = response.data || response;
            if (items && items.length > 0) {
              navigate(`/items?search=${encodeURIComponent(value)}&open=${items[0].id}`);
            } else {
              navigate(`/items?search=${encodeURIComponent(value)}`);
              toast.error(`Barcode "${value}" not found in inventory.`);
            }
          } catch {
            navigate(`/items?search=${encodeURIComponent(value)}`);
          }
        }}
      />
    </header>
  );
}
