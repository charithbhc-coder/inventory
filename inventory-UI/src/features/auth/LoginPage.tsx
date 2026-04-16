import { useState, useEffect, type CSSProperties } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AtSign, Lock, Eye, EyeOff, Info, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import AuthLayout from '@/components/layout/AuthLayout';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });

  useEffect(() => {
    reset({ email: '', password: '' });
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authService.login(data.email, data.password);
      setAuth(res.user, res.accessToken, res.refreshToken);
      if (res.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        toast.success(`Welcome back, ${res.user.firstName}!`);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Invalid credentials. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} style={styles.card}>
        {/* Card heading */}
        <div style={styles.heading}>
          <h2 style={styles.headingTitle}>Log into your account</h2>
          <p style={styles.headingDesc}>Please enter your details</p>
        </div>

        {/* Email */}
        <div style={styles.fieldGroup}>
          <label htmlFor="login-email" style={styles.label}>EMAIL</label>
          <div style={{
            ...styles.inputWrap,
            boxShadow: emailFocus ? styles.inputWrapFocusShadow : styles.inputWrapShadow,
          }}>
            <AtSign size={15} color={emailFocus ? '#F5C518' : '#aaa'} style={styles.inputIcon} />
            <input
              id="login-email"
              placeholder="Email or Username"
              autoComplete="email"
              style={styles.input}
              {...register('email')}
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
            />
          </div>
          {errors.email && <p style={styles.errMsg}>{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div style={styles.fieldGroup}>
          <label htmlFor="login-password" style={styles.label}>PASSWORD</label>
          <div style={{
            ...styles.inputWrap,
            boxShadow: passFocus ? styles.inputWrapFocusShadow : styles.inputWrapShadow,
          }}>
            <Lock size={15} color={passFocus ? '#F5C518' : '#aaa'} style={styles.inputIcon} />
            <input
              id="login-password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••••"
              autoComplete="current-password"
              style={{ ...styles.input, paddingRight: 44 }}
              {...register('password')}
              onFocus={() => setPassFocus(true)}
              onBlur={() => setPassFocus(false)}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              style={styles.eyeBtn}
              tabIndex={-1}
            >
              {showPass
                ? <EyeOff size={15} color="#aaa" />
                : <Eye size={15} color="#aaa" />}
            </button>
          </div>
          {errors.password && <p style={styles.errMsg}>{errors.password.message}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
          </div>
        </div>

        {/* Notice */}
        <div style={styles.notice}>
          <Info size={14} color="#7a6f5a" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={styles.noticeText}>
            <strong>System Notice:</strong> New <em>Company Admins</em> must use the
            temporary passkey issued during onboarding for their first authentication session.
          </p>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.cta,
            ...(loading ? styles.ctaLoading : {}),
          }}
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
              <span>Sign In to KTMG-Vault</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
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
  } as CSSProperties,

  heading: {
    textAlign: 'center' as const,
    marginBottom: 4,
  } as CSSProperties,

  headingTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#1a1a2e',
    margin: 0,
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
  } as CSSProperties,

  headingDesc: {
    fontSize: 13.5,
    fontWeight: 500,
    color: '#9a9284',
    lineHeight: 1.5,
    margin: 0,
  } as CSSProperties,

  // ── Form fields ──
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  } as CSSProperties,

  label: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.13em',
    color: '#999084',
  } as CSSProperties,

  forgotLink: {
    fontSize: 11,
    fontWeight: 700,
    color: '#c5a400',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
  } as CSSProperties,

  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 50,
    background: '#f0eeea',
    transition: 'box-shadow 0.2s ease',
  } as CSSProperties,

  inputWrapShadow: [
    'inset 3px 3px 7px rgba(0,0,0,0.08)',
    'inset -2px -2px 5px rgba(255,255,255,0.95)',
  ].join(', '),

  inputWrapFocusShadow: [
    'inset 3px 3px 7px rgba(0,0,0,0.1)',
    'inset -2px -2px 5px rgba(255,255,255,0.95)',
    '0 0 0 2.5px rgba(245,197,24,0.35)',
  ].join(', '),

  inputIcon: {
    position: 'absolute',
    left: 16,
    pointerEvents: 'none',
    transition: 'color 0.2s',
  } as CSSProperties,

  input: {
    width: '100%',
    padding: '11px 16px 11px 40px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#1a1a2e',
    borderRadius: 50,
    fontFamily: 'inherit',
  } as CSSProperties,

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
  } as CSSProperties,

  errMsg: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 2,
    marginLeft: 14,
  } as CSSProperties,

  // ── Notice ──
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: 'rgba(245,235,200,0.38)',
    borderRadius: 14,
    padding: '8px 12px',
    border: '1px solid rgba(210,190,130,0.25)',
  } as CSSProperties,

  noticeText: {
    fontSize: 12.5,
    color: '#7a6f5a',
    lineHeight: 1.55,
    margin: 0,
  } as CSSProperties,

  // ── CTA ──
  cta: {
    width: '100%',
    padding: '12px 24px',
    borderRadius: 50,
    background: 'linear-gradient(135deg, #f5d020 0%, #f5c518 60%, #e8b800 100%)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14.5,
    fontWeight: 700,
    letterSpacing: '0.01em',
    color: '#1a1100',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.15s',
    boxShadow: [
      '0 4px 20px rgba(245,197,24,0.45)',
      '0 1px 4px rgba(0,0,0,0.1)',
    ].join(', '),
    fontFamily: 'inherit',
  } as CSSProperties,

  ctaLoading: {
    opacity: 0.75,
    cursor: 'not-allowed',
  } as CSSProperties,

  ctaShadow: [
    '0 4px 20px rgba(245,197,24,0.45)',
    '0 1px 4px rgba(0,0,0,0.1)',
  ].join(', '),

  ctaHoverShadow: [
    '0 8px 28px rgba(245,197,24,0.55)',
    '0 2px 8px rgba(0,0,0,0.12)',
  ].join(', '),

  // ── Spinner ──
  spinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2.5px solid rgba(0,0,0,0.15)',
    borderTopColor: '#1a1100',
    borderRadius: '50%',
    animation: 'spin 0.65s linear infinite',
  } as CSSProperties,

  copy: {
    fontSize: 10.5,
    color: '#ccc8c2',
    marginTop: 4,
    letterSpacing: '0.02em',
  } as CSSProperties,
};
