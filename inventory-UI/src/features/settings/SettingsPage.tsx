import { useState, useEffect } from 'react';
import { 
  Globe, 
  Bell, 
  Save, 
  Check, 
  AlertTriangle,
  Layout,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settings.service';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';
import toast from 'react-hot-toast';

type TabType = 'general' | 'notifications' | 'ui';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  // Initialize with immediate defaults to ensure "Nothing Works" bug is fixed
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({
    system_name: 'KTMG-VAULT',
    system_timezone: 'UTC',
    enable_push_notifications: true,
    enable_status_alerts: true,
    theme_preference: 'system',
    date_format: 'DD/MM/YYYY'
  });
  
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore(s => s.hasPermission);

  // Fetch settings
  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings,
    retry: 2,
  });

  // Load into local state only on first success
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (settings.length > 0 && !hasInitialized) {
      const mapped = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
      setLocalSettings(prev => ({ ...prev, ...mapped }));
      setHasInitialized(true);
    }
  }, [settings, hasInitialized]);

  // Update mutation
  const mutation = useMutation({
    mutationFn: (payload: { key: string; value: any; category?: string }[]) => 
      settingsService.updateBulk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('System settings updated successfully');
    },
    onError: () => {
      // Even if API 404s, we let the user know, but they can still interact with the UI
      toast.error('Sync failed. Please check backend connection.');
    }
  });

  const handleSave = () => {
    const payload = Object.entries(localSettings).map(([key, value]) => ({
      key,
      value,
      category: getCategory(key)
    }));
    mutation.mutate(payload);
  };

  const getCategory = (key: string) => {
    if (key.includes('notification') || key.includes('alert')) return 'NOTIFICATIONS';
    if (key.includes('theme') || key.includes('ui')) return 'UI';
    return 'GENERAL';
  };

  const updateField = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={styles.container} className="settings-container">
      <style>{`
        .settings-container {
          padding: 32px;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .settings-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 32px;
        }
        .settings-sidebar {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .settings-card {
          padding: 32px;
          min-height: 480px;
          border: 1px solid var(--border-dark);
        }

        @media (max-width: 768px) {
          .settings-container { padding: 16px; }
          .settings-header { flex-direction: column; align-items: stretch; gap: 16px; text-align: center; }
          .settings-layout { grid-template-columns: 1fr; gap: 24px; }
          .settings-sidebar { 
            flex-direction: row; 
            overflow-x: auto; 
            padding-bottom: 12px;
            margin-bottom: 8px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }
          .settings-tab-btn { 
            white-space: nowrap; 
            padding: 12px 20px !important; 
            flex-shrink: 0;
            scroll-snap-align: start;
          }
          .settings-card { padding: 20px; min-height: auto; }
          .settings-theme-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <header className="settings-header">
        <div>
          <h1 style={styles.title}>System Settings</h1>
          <p style={styles.subtitle}>Configure global platform parameters and preferences.</p>
        </div>
        {activeTab === 'general' && hasPermission(AdminPermission.UPDATE_SETTINGS) && (
          <button 
            style={{...styles.saveBtn, opacity: mutation.isPending ? 0.7 : 1}} 
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : (
              <><Save size={18} /> Apply Changes</>
            )}
          </button>
        )}
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <TabButton 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')} 
            icon={<Globe size={18} />} 
            label="General" 
          />
          <TabButton 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
            icon={<Bell size={18} />} 
            label="Notifications" 
          />
          <TabButton 
            active={activeTab === 'ui'} 
            onClick={() => setActiveTab('ui')} 
            icon={<Layout size={18} />} 
            label="Appearance" 
          />
        </aside>

        <main style={styles.content}>
          <div className="premium-glass-card settings-card">
            {activeTab === 'general' && (
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Global Configuration</h3>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>System Branding Name</label>
                  <input 
                    style={styles.input} 
                    value={localSettings.system_name || ''} 
                    onChange={e => updateField('system_name', e.target.value)}
                    placeholder="e.g. KTMG-VAULT"
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>System Master Timezone</label>
                  <select 
                    style={styles.select} 
                    value={localSettings.system_timezone || 'UTC'} 
                    onChange={e => updateField('system_timezone', e.target.value)}
                  >
                    <option value="UTC">UTC (Universal Time)</option>
                    <option value="Asia/Colombo">Asia/Colombo (+05:30)</option>
                    <option value="America/New_York">US Eastern (EST/EDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (+08:00)</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Display Date Format</label>
                  <div style={styles.radioGroup}>
                    {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(fmt => (
                      <button 
                        key={fmt}
                        style={localSettings.date_format === fmt ? styles.radioBtnActive : styles.radioBtn}
                        onClick={() => updateField('date_format', fmt)}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Push Notifications</h3>
                <p style={styles.sectionSub}>Manage internal alerts in the system navbar.</p>
                
                <ToggleRow 
                  label="Asset Registration Alerts"
                  sub="Notify when new assets are registered"
                  active={localSettings.notify_on_item_added ?? true}
                  disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                  onToggle={() => {
                    const newVal = !(localSettings.notify_on_item_added ?? true);
                    updateField('notify_on_item_added', newVal);
                    mutation.mutate([{ key: 'notify_on_item_added', value: newVal, category: 'NOTIFICATIONS' }]);
                  }}
                />

                <ToggleRow 
                  label="Asset Assignment Alerts"
                  sub="Notify when assets are assigned or transferred"
                  active={localSettings.notify_on_item_assigned ?? true}
                  disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                  onToggle={() => {
                    const newVal = !(localSettings.notify_on_item_assigned ?? true);
                    updateField('notify_on_item_assigned', newVal);
                    mutation.mutate([{ key: 'notify_on_item_assigned', value: newVal, category: 'NOTIFICATIONS' }]);
                  }}
                />

                <ToggleRow 
                  label="Repair Workflow Alerts"
                  sub="Notify for sent/returned repair events"
                  active={localSettings.notify_on_repair ?? true}
                  disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                  onToggle={() => {
                    const newVal = !(localSettings.notify_on_repair ?? true);
                    updateField('notify_on_repair', newVal);
                    mutation.mutate([{ key: 'notify_on_repair', value: newVal, category: 'NOTIFICATIONS' }]);
                  }}
                />

                <div style={{ margin: '32px 0 16px', borderBottom: '1px solid var(--border-dark)', paddingBottom: 8 }}>
                  <h4 style={{ fontSize: 13, color: 'var(--accent-red)', fontWeight: 800 }}>Critical Alerts (Action Required)</h4>
                </div>

                <ToggleRow 
                  label="Asset Lost Alerts"
                  sub="Critical notifications for missing items"
                  active={localSettings.notify_on_item_lost ?? true}
                  disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                  onToggle={() => {
                    const newVal = !(localSettings.notify_on_item_lost ?? true);
                    updateField('notify_on_item_lost', newVal);
                    mutation.mutate([{ key: 'notify_on_item_lost', value: newVal, category: 'NOTIFICATIONS' }]);
                  }}
                />

                <ToggleRow 
                  label="Disposal Verification"
                  sub="Alerts for permanent asset removal"
                  active={localSettings.notify_on_item_disposed ?? true}
                  disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                  onToggle={() => {
                    const newVal = !(localSettings.notify_on_item_disposed ?? true);
                    updateField('notify_on_item_disposed', newVal);
                    mutation.mutate([{ key: 'notify_on_item_disposed', value: newVal, category: 'NOTIFICATIONS' }]);
                  }}
                />

                <div style={styles.alertBox}>
                  <AlertTriangle size={18} />
                  <span>Email notifications are currently disabled by global policy.</span>
                </div>
              </div>
            )}

            {activeTab === 'ui' && (
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Theme Presence</h3>
                <div style={styles.themeGrid} className="settings-theme-grid">
                  <ThemeButton 
                    active={localSettings.theme_preference === 'light'} 
                    disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                    onClick={() => {
                      updateField('theme_preference', 'light');
                      mutation.mutate([{ key: 'theme_preference', value: 'light', category: 'UI' }]);
                    }}
                    icon={<Sun size={20} />}
                    label="Light"
                  />
                  <ThemeButton 
                    active={localSettings.theme_preference === 'dark'} 
                    disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                    onClick={() => {
                      updateField('theme_preference', 'dark');
                      mutation.mutate([{ key: 'theme_preference', value: 'dark', category: 'UI' }]);
                    }}
                    icon={<Moon size={20} />}
                    label="Dark"
                  />
                  <ThemeButton 
                    active={localSettings.theme_preference === 'system'} 
                    disabled={!hasPermission(AdminPermission.UPDATE_SETTINGS)}
                    onClick={() => {
                      updateField('theme_preference', 'system');
                      mutation.mutate([{ key: 'theme_preference', value: 'system', category: 'UI' }]);
                    }}
                    icon={<Monitor size={20} />}
                    label="Auto"
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="settings-tab-btn"
      style={{
        ...styles.tabBtn,
        background: active ? 'var(--accent-yellow)' : 'transparent',
        color: active ? '#000' : 'var(--text-muted)',
        fontWeight: active ? 700 : 500
      }}
    >
      {icon} {label}
    </button>
  );
}

function ToggleRow({ label, sub, active, onToggle, disabled }: any) {
  return (
    <div style={styles.toggleRow}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
      </div>
      <div 
        onClick={() => {
          if (onToggle && !disabled) onToggle();
        }}
        style={{
          ...styles.toggleBg,
          background: active ? 'var(--accent-yellow)' : 'var(--bg-dark)',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <div style={{
          ...styles.toggleCircle,
          transform: active ? 'translateX(20px)' : 'translateX(4px)'
        }} />
      </div>
    </div>
  );
}

function ThemeButton({ active, icon, label, onClick, disabled }: any) {
  return (
    <button 
      onClick={() => {
        if (onClick && !disabled) onClick();
      }}
      style={{
        ...styles.themeBtn,
        border: active ? '2px solid var(--accent-yellow)' : '1px solid var(--border-dark)',
        background: active ? 'rgba(255, 184, 0, 0.05)' : 'transparent',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {icon}
      <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
      {active && <Check size={14} style={{ position: 'absolute', top: 6, right: 6, color: 'var(--accent-yellow)' }} />}
    </button>
  );
}

const styles = {
  container: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100%'
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    margin: '0 0 8px',
    color: 'var(--text-main)',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
    fontWeight: 500
  },
  saveBtn: {
    background: 'var(--accent-yellow)',
    color: '#000',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(255, 184, 0, 0.2)'
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  content: {
    minHeight: 0,
    flex: 1
  },
  formSection: {
    maxWidth: '500px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-main)',
    marginBottom: '24px',
  },
  sectionSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '-20px',
    marginBottom: '24px',
  },
  inputGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    background: 'var(--bg-dark)',
    border: '1px solid var(--border-dark)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: 'var(--text-main)',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    width: '100%',
    background: 'var(--bg-dark)',
    border: '1px solid var(--border-dark)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: 'var(--text-main)',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  radioGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap' as const
  },
  radioBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-dark)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  radioBtnActive: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--accent-yellow)',
    background: 'rgba(255, 184, 0, 0.1)',
    color: 'var(--accent-yellow)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    background: 'rgba(255,255,255,0.02)',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '12px',
    border: '1px solid var(--border-dark)'
  },
  toggleBg: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'background 0.2s',
    flexShrink: 0
  },
  toggleCircle: {
    width: '16px',
    height: '16px',
    background: '#fff',
    borderRadius: '50%',
    position: 'absolute' as const,
    top: '4px',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  alertBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255, 184, 0, 0.05)',
    border: '1px solid rgba(255, 184, 0, 0.15)',
    padding: '12px 16px',
    borderRadius: '10px',
    color: 'var(--accent-yellow)',
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '24px'
  },
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  themeBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '24px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'all 0.2s',
    color: 'var(--text-main)',
  }
};
