import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User as UserIcon,
  Mail,
  Phone,
  Camera,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form
  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: errorsProfile, isDirty: isDirtyProfile }, reset: resetProfile } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });

  // Password Form
  const { register: regPass, handleSubmit: handlePass, formState: { errors: errorsPass }, reset: resetPass } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Ref to track if we have initialized the form with user data once
  const initialized = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      resetProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
      });
      initialized.current = true;
    }
  }, [user, resetProfile]);

  const onUpdateProfile = async (data: ProfileFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedUser = await authService.updateMe(data);
      if (accessToken && refreshToken) {
        setAuth({ ...user, ...updatedUser }, accessToken, refreshToken);
      }
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      await authService.changePassword(data.currentPassword, data.newPassword, data.confirmPassword);
      toast.success('Password updated successfully');
      resetPass();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const onAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const updatedUser = await authService.uploadAvatar(file);
      if (accessToken && refreshToken) {
        setAuth({ ...user, ...updatedUser }, accessToken, refreshToken);
      }
      toast.success('Avatar updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const avatarUrl = user.avatarUrl
    ? `${baseUrl}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`
    : '';

  return (
    <div className="profile-container" style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>My Profile</h1>
        <p style={styles.subtitle}>Manage your personal information and account security</p>
      </header>

      <div className="profile-grid" style={styles.grid}>
        {/* Left Sidebar - Profile Summary */}
        <div className="profile-sidebar" style={styles.sidebar}>
          <div style={styles.profileSummary}>
            <div style={styles.avatarContainer}>
              <div style={styles.avatarWrapper}>
                {user.avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    style={styles.avatar}
                  />
                ) : (
                  <div style={styles.avatarPlaceholder}>
                    {user?.firstName?.[0] || '?'}{user?.lastName?.[0] || ''}
                  </div>
                )}
                <button
                  onClick={onAvatarClick}
                  style={styles.avatarEditBtn}
                  disabled={uploading}
                >
                  {uploading
                    ? <Loader2 size={16} color="#1a1a2e" className="spin" />
                    : <Camera size={16} color="#1a1a2e" />
                  }
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </div>
            </div>
            <div style={styles.summaryInfo}>
              <h2 style={styles.summaryName}>{user?.firstName || 'User'} {user?.lastName || ''}</h2>
              <span style={styles.summaryRole}>{user?.role?.replace('_', ' ') || 'USER'}</span>
            </div>
          </div>

          <nav className="profile-nav" style={styles.sideNav}>
            <button
              style={{ ...styles.sideNavLink, ...(activeTab === 'general' ? styles.sideNavLinkActive : {}) }}
              onClick={() => setActiveTab('general')}
            >
              <UserIcon size={18} /> General Information
            </button>
            <button
              style={{ ...styles.sideNavLink, ...(activeTab === 'security' ? styles.sideNavLinkActive : {}) }}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={18} /> Password & Security
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="profile-main" style={styles.mainContent}>
          {activeTab === 'general' ? (
            <form onSubmit={handleProfile(onUpdateProfile)} style={styles.formCard}>
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>General Information</h3>
                <p style={styles.sectionDesc}>Update your name and your contact details.</p>

                <div className="form-responsive-grid" style={styles.formGrid}>
                  <div style={{ ...styles.fieldGroup, flexDirection: 'column' as const }}>
                    <label style={styles.label}>FIRST NAME</label>
                    <div style={styles.inputWrapper}>
                      <input
                        {...regProfile('firstName')}
                        style={styles.input}
                        placeholder="Enter first name"
                      />
                    </div>
                    {errorsProfile.firstName && <span style={styles.error}>{errorsProfile.firstName.message}</span>}
                  </div>

                  <div style={{ ...styles.fieldGroup, flexDirection: 'column' as const }}>
                    <label style={styles.label}>LAST NAME</label>
                    <div style={styles.inputWrapper}>
                      <input
                        {...regProfile('lastName')}
                        style={styles.input}
                        placeholder="Enter last name"
                      />
                    </div>
                    {errorsProfile.lastName && <span style={styles.error}>{errorsProfile.lastName.message}</span>}
                  </div>

                  <div className="full-width-field" style={{ ...styles.fieldGroup, gridColumn: 'span 2', flexDirection: 'column' as const }}>
                    <label style={styles.label}>EMAIL ADDRESS</label>
                    <div style={{ ...styles.inputWrapper, opacity: 0.7, background: 'var(--bg-dark)' }}>
                      <Mail size={16} color="var(--text-muted)" style={styles.inputIcon} />
                      <input
                        defaultValue={user.email}
                        disabled
                        style={{ ...styles.input, cursor: 'not-allowed' }}
                      />
                    </div>
                    <p style={styles.helpText}>Email cannot be changed.</p>
                  </div>

                  <div className="full-width-field" style={{ ...styles.fieldGroup, gridColumn: 'span 2', flexDirection: 'column' as const }}>
                    <label style={styles.label}>PHONE NUMBER</label>
                    <div style={styles.inputWrapper}>
                      <Phone size={16} color="var(--text-muted)" style={styles.inputIcon} />
                      <input
                        {...regProfile('phone')}
                        style={styles.input}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    {errorsProfile.phone && <span style={styles.error}>{errorsProfile.phone.message}</span>}
                  </div>
                </div>
              </div>

              <footer style={styles.formFooter}>
                <button
                  type="submit"
                  disabled={loading || !isDirtyProfile}
                  style={{
                    ...styles.saveBtn,
                    background: (loading || !isDirtyProfile) ? 'rgba(255,255,255,0.05)' : 'var(--accent-yellow)',
                    color: (loading || !isDirtyProfile) ? 'var(--text-muted)' : '#1a1a2e',
                    border: (loading || !isDirtyProfile) ? '1px solid var(--border-dark)' : 'none',
                    opacity: 1,
                    cursor: (loading || !isDirtyProfile) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? <Loader2 size={18} className="spin" /> : <><Save size={18} /> Save Changes</>}
                </button>
              </footer>
            </form>
          ) : (
            <form onSubmit={handlePass(onChangePassword)} style={styles.formCard}>
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Password & Security</h3>
                <p style={styles.sectionDesc}>Update your password to keep your account secure.</p>

                {/* Hidden username field to satisfy password managers and prevent email autofill in confirm password box */}
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  defaultValue={user.email}
                  style={{ display: 'none' }}
                  readOnly
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ ...styles.fieldGroup, flexDirection: 'column' as const }}>
                    <label style={styles.label}>CURRENT PASSWORD</label>
                    <div style={styles.inputWrapper}>
                      <Lock size={16} color="var(--text-muted)" style={styles.inputIcon} />
                      <input
                        type={showPass.current ? 'text' : 'password'}
                        {...regPass('currentPassword')}
                        style={styles.input}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPass(s => ({ ...s, current: !s.current }))} style={styles.eyeBtn}>
                        {showPass.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errorsPass.currentPassword && <span style={styles.error}>{errorsPass.currentPassword.message}</span>}
                  </div>

                  <div style={{ ...styles.fieldGroup, flexDirection: 'column' as const }}>
                    <label style={styles.label}>NEW PASSWORD</label>
                    <div style={styles.inputWrapper}>
                      <Lock size={16} color="var(--text-muted)" style={styles.inputIcon} />
                      <input
                        type={showPass.new ? 'text' : 'password'}
                        {...regPass('newPassword')}
                        style={styles.input}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPass(s => ({ ...s, new: !s.new }))} style={styles.eyeBtn}>
                        {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errorsPass.newPassword && <span style={styles.error}>{errorsPass.newPassword.message}</span>}
                  </div>

                  <div style={{ ...styles.fieldGroup, flexDirection: 'column' as const }}>
                    <label style={styles.label}>CONFIRM NEW PASSWORD</label>
                    <div style={styles.inputWrapper}>
                      <Lock size={16} color="var(--text-muted)" style={styles.inputIcon} />
                      <input
                        type={showPass.confirm ? 'text' : 'password'}
                        {...regPass('confirmPassword')}
                        style={styles.input}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPass(s => ({ ...s, confirm: !s.confirm }))} style={styles.eyeBtn}>
                        {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errorsPass.confirmPassword && <span style={styles.error}>{errorsPass.confirmPassword.message}</span>}
                  </div>
                </div>
              </div>

              <footer style={styles.formFooter}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.saveBtn,
                    background: loading ? 'rgba(255,255,255,0.05)' : 'var(--accent-yellow)',
                    color: loading ? 'var(--text-muted)' : '#1a1a2e',
                    border: loading ? '1px solid var(--border-dark)' : 'none',
                    opacity: 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? <Loader2 size={18} className="spin" /> : <><Shield size={18} /> Update Password</>}
                </button>
              </footer>
            </form>
          )}

          <div style={styles.statusCard}>
            <div style={styles.statusIcon}>
              <CheckCircle2 size={24} color="#10b981" />
            </div>
            <div>
              <h4 style={styles.statusTitle}>Active Account</h4>
              <p style={styles.statusText}>Your account is in good standing. Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-sidebar {
            flex-direction: row !important;
            align-items: center;
            gap: 16px !important;
          }
          .profile-nav {
            flex-direction: row !important;
            overflow-x: auto;
            flex: 1;
          }
        }
        @media (max-width: 600px) {
          .profile-sidebar {
            flex-direction: column !important;
          }
          .profile-nav {
            width: 100%;
          }
          .form-responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .full-width-field {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '8px 0',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: 'var(--text-main)',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '32px',
    alignItems: 'start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  profileSummary: {
    background: 'var(--bg-card)',
    borderRadius: '24px',
    padding: '32px 24px',
    border: '1px solid var(--border-dark)',
    textAlign: 'center' as const,
    boxShadow: 'var(--card-shadow)',
    width: '100%',
  },
  avatarContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  avatarWrapper: {
    position: 'relative' as const,
    width: '100px',
    height: '100px',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '4px solid var(--bg-card)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'var(--accent-yellow)',
    color: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 800,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  avatarEditBtn: {
    position: 'absolute' as const,
    bottom: '0',
    right: '0',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--accent-yellow)',
    color: '#1a1a2e',
    border: '3px solid var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  summaryInfo: {},
  summaryName: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-main)',
    margin: '0 0 4px',
  },
  summaryRole: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  sideNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sideNavLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
  },
  sideNavLinkActive: {
    background: 'var(--bg-card)',
    color: 'var(--text-main)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    border: '1px solid var(--border-dark)',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  formCard: {
    background: 'var(--bg-card)',
    borderRadius: '24px',
    border: '1px solid var(--border-dark)',
    boxShadow: 'var(--card-shadow)',
    overflow: 'hidden',
  },
  formSection: {
    padding: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 8px',
    color: 'var(--text-main)',
  },
  sectionDesc: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 24px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    borderRadius: '12px',
    border: '1.5px solid var(--border-dark)',
    background: 'var(--search-bg)',
    transition: 'all 0.2s',
  },
  inputIcon: {
    position: 'absolute' as const,
    left: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    color: 'var(--text-main)',
    paddingLeft: '42px',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  helpText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: '12px',
    marginTop: '4px',
  },
  formFooter: {
    padding: '20px 32px',
    background: 'rgba(0,0,0,0.02)',
    borderTop: '1px solid var(--border-dark)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '12px',
    background: 'var(--accent-yellow)',
    color: '#1a1a2e',
    border: 'none',
    fontSize: '14px',
    fontWeight: 700,
    transition: 'transform 0.2s, opacity 0.2s, background 0.2s',
  },
  statusCard: {
    background: 'rgba(16, 185, 129, 0.05)',
    borderRadius: '20px',
    padding: '20px 24px',
    border: '1px solid rgba(16, 185, 129, 0.1)',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  statusIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
  },
  statusTitle: {
    margin: '0 0 4px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#065f46',
  },
  statusText: {
    margin: 0,
    fontSize: '13px',
    color: '#047857',
  },
} as const;
