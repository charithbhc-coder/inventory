import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, Check, ArrowRight, ShieldCheck, Key, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import AuthLayout from '@/components/layout/AuthLayout';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[A-Z]/, 'Must contain uppercase'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div style={{ ...styles.reqItem, ...(met ? styles.reqItemMet : {}) }}>
      <div style={styles.reqDotWrap}>
        {met ? (
          <div style={styles.reqDotInnerMet}>
            <Check size={8} color="#fff" strokeWidth={4} />
          </div>
        ) : (
          <div style={styles.reqDotInner} />
        )}
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const [curFocus, setCurFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [cpwFocus, setCpwFocus] = useState(false);

  const [showCurPass, setShowCurPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const newPassword = watch('newPassword', '');

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One special symbol', met: /[^a-zA-Z0-9]/.test(newPassword) },
    { label: 'One numeric value', met: /[0-9]/.test(newPassword) },
    { label: 'Mixed case (Aa)', met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
  ];

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authService.changePassword(data.currentPassword, data.newPassword, data.confirmPassword);
      toast.success('Password updated! Please log in with your new password.');
      logout();
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Password change failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={styles.card}>
        <div style={styles.heading}>
          <h2 style={styles.headingTitle}>Welcome Aboard</h2>
          <p style={styles.headingDesc}>
            Before accessing the vault, you must replace your temporary credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Current Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>CURRENT TEMPORARY PASSWORD</label>
            <div style={{
              ...styles.inputWrap,
              boxShadow: curFocus ? styles.inputFocusShadow : styles.inputShadow,
            }}>
              <Key size={15} color={curFocus ? '#F5C518' : '#aaa'} style={styles.inputIcon} />
              <input
                type={showCurPass ? 'text' : 'password'}
                placeholder="••••••••••"
                style={{ ...styles.input, paddingRight: 44 }}
                {...register('currentPassword')}
                onFocus={() => setCurFocus(true)}
                onBlur={() => setCurFocus(false)}
              />
              <button
                type="button"
                onClick={() => setShowCurPass(v => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showCurPass ? <EyeOff size={15} color="#aaa" /> : <Eye size={15} color="#aaa" />}
              </button>
            </div>
            {errors.currentPassword && <p style={styles.errMsg}>{errors.currentPassword.message}</p>}
          </div>

          {/* New Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>NEW PASSWORD</label>
            <div style={{
              ...styles.inputWrap,
              boxShadow: pwFocus ? styles.inputFocusShadow : styles.inputShadow,
            }}>
              <Lock size={15} color={pwFocus ? '#F5C518' : '#aaa'} style={styles.inputIcon} />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••••"
                style={{ ...styles.input, paddingRight: 44 }}
                {...register('newPassword')}
                onFocus={() => setPwFocus(true)}
                onBlur={() => setPwFocus(false)}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} color="#aaa" /> : <Eye size={15} color="#aaa" />}
              </button>
            </div>
            {errors.newPassword && <p style={styles.errMsg}>{errors.newPassword.message}</p>}
          </div>

          {/* Confirm Password */}
          <div style={{ ...styles.fieldGroup, marginBottom: 4 }}>
            <label style={styles.label}>CONFIRM NEW PASSWORD</label>
            <div style={{
              ...styles.inputWrap,
              boxShadow: cpwFocus ? styles.inputFocusShadow : styles.inputShadow,
            }}>
              <Lock size={15} color={cpwFocus ? '#F5C518' : '#aaa'} style={styles.inputIcon} />
              <input
                type={showConfirmPass ? 'text' : 'password'}
                placeholder="••••••••••"
                style={{ ...styles.input, paddingRight: 44 }}
                {...register('confirmPassword')}
                onFocus={() => setCpwFocus(true)}
                onBlur={() => setCpwFocus(false)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(v => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showConfirmPass ? <EyeOff size={15} color="#aaa" /> : <Eye size={15} color="#aaa" />}
              </button>
            </div>
            {errors.confirmPassword && <p style={styles.errMsg}>{errors.confirmPassword.message}</p>}
            
            {/* Real-time Match Indicator */}
            {!errors.confirmPassword && watch('confirmPassword')?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, marginLeft: 14 }}>
                <span style={{
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: watch('newPassword') === watch('confirmPassword') ? '#10b981' : '#dc2626',
                  fontWeight: 600
                }}>
                  {watch('newPassword') === watch('confirmPassword') ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                  {watch('newPassword') === watch('confirmPassword') ? 'Passwords match' : 'Passwords do not match'}
                </span>
              </div>
            )}
          </div>

          {/* Shield / Requirements */}
          <div style={styles.reqBox}>
            <div style={styles.reqTitle}>
              <ShieldCheck size={14} color="#999084" />
              <span>SECURITY REQUIREMENTS</span>
            </div>
            <div style={styles.reqGrid}>
              {requirements.map(r => (
                <RequirementItem key={r.label} met={r.met} label={r.label} />
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.cta, ...(loading ? styles.ctaDisabled : {}) }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = styles.ctaHoverShadow;
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = styles.ctaShadow;
            }}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              <>
                <span>Initialize Vault Access</span>
                <ArrowRight size={15} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

const styles = {
  // ── Card ──
  card: {
    width: '100%',
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 24,
    padding: '24px 28px',
    boxShadow: [
      '0 2px 0px rgba(255,255,255,0.9) inset',
      '0 32px 64px rgba(0,0,0,0.09)',
      '0 8px 24px rgba(0,0,0,0.06)',
      '0 1px 2px rgba(0,0,0,0.04)',
    ].join(', '),
    border: '1px solid rgba(255,255,255,0.9)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  } as React.CSSProperties,

  heading: {
    textAlign: 'center',
    paddingBottom: 8,
  } as React.CSSProperties,

  headingTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#1a1a2e',
    margin: '0 0 6px',
    letterSpacing: '-0.3px',
  } as React.CSSProperties,

  headingDesc: {
    fontSize: 13.5,
    fontWeight: 500,
    color: '#9a9284',
    lineHeight: 1.5,
    margin: 0,
  } as React.CSSProperties,

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  } as React.CSSProperties,

  label: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.13em',
    color: '#999084',
  } as React.CSSProperties,

  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 50,
    background: '#f0eeea',
    transition: 'box-shadow 0.2s ease',
  } as React.CSSProperties,

  inputShadow: 'inset 3px 3px 7px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.95)',
  inputFocusShadow: 'inset 3px 3px 7px rgba(0,0,0,0.1), inset -2px -2px 5px rgba(255,255,255,0.95), 0 0 0 2.5px rgba(245,197,24,0.35)',

  inputIcon: {
    position: 'absolute',
    left: 16,
    pointerEvents: 'none',
    transition: 'color 0.2s',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '9px 16px 9px 40px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#1a1a2e',
    borderRadius: 50,
    fontFamily: 'inherit',
  } as React.CSSProperties,

  eyeBtn: {
    position: 'absolute',
    right: 14,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: '50%',
    transition: 'opacity 0.15s',
  } as React.CSSProperties,

  errMsg: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 2,
    marginLeft: 14,
  } as React.CSSProperties,

  reqBox: {
    background: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
    borderRadius: 16,
    padding: '8px 12px',
    marginBottom: 0,
  } as React.CSSProperties,

  reqTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.13em',
    color: '#999084',
    marginBottom: 4,
  } as React.CSSProperties,

  reqGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '6px 12px',
  } as React.CSSProperties,

  reqItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#a0988c',
    transition: 'color 0.2s ease',
  } as React.CSSProperties,

  reqItemMet: {
    color: '#2d6a4f',
    fontWeight: 500,
  } as React.CSSProperties,

  reqDotWrap: {
    flexShrink: 0,
    width: 14,
    height: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  reqDotInner: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#d4cece',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  reqDotInnerMet: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 5px rgba(22,163,74,0.3)',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  cta: {
    width: '100%',
    padding: '12px 24px',
    borderRadius: 50,
    background: 'linear-gradient(135deg, #f5d020 0%, #f5c518 60%, #e8b800 100%)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14.5,
    fontWeight: 700,
    color: '#1a1100',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    boxShadow: '0 4px 20px rgba(245,197,24,0.45), 0 1px 4px rgba(0,0,0,0.1)',
    fontFamily: 'inherit',
    marginTop: 4,
  } as React.CSSProperties,

  ctaDisabled: { opacity: 0.7, cursor: 'not-allowed' } as React.CSSProperties,
  ctaShadow: '0 4px 20px rgba(245,197,24,0.45), 0 1px 4px rgba(0,0,0,0.1)',
  ctaHoverShadow: '0 8px 28px rgba(245,197,24,0.55), 0 2px 8px rgba(0,0,0,0.12)',

  spinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2.5px solid rgba(0,0,0,0.15)',
    borderTopColor: '#1a1100',
    borderRadius: '50%',
    animation: 'spin 0.65s linear infinite',
  } as React.CSSProperties,
};
