import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';

const schema = z.object({
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

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [pwFocus, setPwFocus] = useState(false);
  const [cpwFocus, setCpwFocus] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const newPassword = watch('newPassword', '');

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One special symbol',    met: /[^a-zA-Z0-9]/.test(newPassword) },
    { label: 'One numeric value',     met: /[0-9]/.test(newPassword) },
    { label: 'Mixed case (Aa)',       met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
  ];

  const onSubmit = async (data: FormData) => {
    if (!token) { toast.error('Invalid reset link.'); return; }
    setLoading(true);
    try {
      await authService.resetPassword(token, data.newPassword, data.confirmPassword);
      toast.success('Password reset! Please log in.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Reset failed. The link may have expired.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.grain} />

      <div style={styles.wrapper}>
        {/* ── Brand ── */}
        <div style={styles.brand}>
          <div style={styles.logoCircle}>
            <Lock size={22} color="#F5C518" strokeWidth={2.5} />
          </div>
          <h1 style={styles.brandName}>KTMG-Vault</h1>
          <p style={styles.brandSub}>Secure Enterprise Access Layer</p>
        </div>

        {/* ── Glass card ── */}
        <div style={styles.card}>
          <div style={styles.heading}>
            <h2 style={styles.headingTitle}>Update Security Key</h2>
            <p style={styles.headingDesc}>
              Replace your temporary or lost credentials with a secure new key.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* New Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>NEW SECURITY KEY</label>
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
            <div style={styles.fieldGroup}>
              <label style={styles.label}>CONFIRM NEW SECURITY KEY</label>
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
                  <span>Update and Continue</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Footer ── */}
        <div style={styles.footer}>
          <a href="#" style={styles.footerLink}>Privacy Policy</a>
          <span style={styles.footerSep}>|</span>
          <a href="#" style={styles.footerLink}>Terms of Service</a>
          <span style={styles.footerSep}>|</span>
          <a href="#" style={styles.footerLink}>Security Audit</a>
        </div>
        <p style={styles.copy}>© 2024 KTMG Systems. KTMG-Vault Secure Layer.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties & { [k: string]: unknown }> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f7f3ec 0%, #f0eeeb 40%, #ebebeb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative',
    fontFamily: "'Inter', system-ui, sans-serif",
  } as React.CSSProperties,

  grain: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '256px 256px',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.6,
  } as React.CSSProperties,

  wrapper: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
  } as React.CSSProperties,

  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 28,
  } as React.CSSProperties,

  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    background: '#14202e',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as React.CSSProperties,

  brandName: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: '#1a1a2e',
    margin: 0,
    lineHeight: 1.1,
  } as React.CSSProperties,

  brandSub: {
    fontSize: 13,
    color: '#9a9284',
    marginTop: 5,
    fontWeight: 400,
  } as React.CSSProperties,

  card: {
    width: '100%',
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 24,
    padding: '36px 36px 32px',
    boxShadow: [
      '0 2px 0px rgba(255,255,255,0.9) inset',
      '0 32px 64px rgba(0,0,0,0.09)',
      '0 8px 24px rgba(0,0,0,0.06)',
      '0 1px 2px rgba(0,0,0,0.04)',
    ].join(', '),
    border: '1px solid rgba(255,255,255,0.9)',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  heading: {
    textAlign: 'center',
    paddingBottom: 20,
  } as React.CSSProperties,

  headingTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 6px',
    letterSpacing: '-0.3px',
  } as React.CSSProperties,

  headingDesc: {
    fontSize: 13,
    color: '#9a9284',
    lineHeight: 1.5,
    margin: 0,
  } as React.CSSProperties,

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  } as React.CSSProperties,

  label: {
    fontSize: 10,
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
    padding: '13px 16px 13px 40px',
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
    padding: '14px 18px',
    marginBottom: 4,
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
    marginBottom: 10,
  } as React.CSSProperties,

  reqGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '8px 12px',
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
    padding: '15px 24px',
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

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
  } as React.CSSProperties,
  footerLink: {
    fontSize: 11,
    letterSpacing: '0.06em',
    fontWeight: 500,
    color: '#bbb5ad',
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  footerSep: { color: '#d8d4cf', fontSize: 11 } as React.CSSProperties,
  copy: {
    fontSize: 10.5,
    color: '#ccc8c2',
    marginTop: 8,
    letterSpacing: '0.02em',
  } as React.CSSProperties,
};
