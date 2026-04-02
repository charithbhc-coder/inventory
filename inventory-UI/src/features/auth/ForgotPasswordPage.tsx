import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign, ArrowLeft, AlertCircle, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';

const schema = z.object({
  email: z.string().email('Enter a valid corporate email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
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

          {sent ? (
            /* ── Success state ── */
            <div style={styles.successWrap}>
              <div style={styles.successIcon}>
                <CheckCircle size={30} color="#16a34a" strokeWidth={2} />
              </div>
              <h2 style={styles.successTitle}>Check your inbox</h2>
              <p style={styles.successDesc}>
                A secure reset link has been sent to your corporate email address.
                The link will expire in 30 minutes.
              </p>
              <Link to="/login" style={styles.returnBtn}>
                <ArrowLeft size={14} strokeWidth={2.5} />
                Return to Login
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Card heading */}
              <div style={styles.heading}>
                <h2 style={styles.headingTitle}>Reset Security Key</h2>
                <p style={styles.headingDesc}>
                  Enter your registered corporate email address to receive a secure reset link.
                </p>
              </div>

              {/* Email input */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Corporate Email</label>
                  <div style={{
                    ...styles.inputWrap,
                    boxShadow: emailFocus ? styles.inputFocusShadow : styles.inputShadow,
                  }}>
                    <AtSign
                      size={15}
                      color={emailFocus ? '#F5C518' : '#aaa'}
                      style={styles.inputIcon}
                    />
                    <input
                      type="email"
                      placeholder="name@ktmg-vault.com"
                      autoComplete="email"
                      style={styles.input}
                      {...register('email')}
                      onFocus={() => setEmailFocus(true)}
                      onBlur={() => setEmailFocus(false)}
                    />
                  </div>
                  {errors.email && <p style={styles.errMsg}>{errors.email.message}</p>}
                </div>

                {/* Info notice */}
                <div style={styles.notice}>
                  <AlertCircle size={14} color="#7a6f5a" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={styles.noticeText}>
                    If you don't have access to your email, please contact your System Admin directly.
                  </p>
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
                      <span>Send Reset Link</span>
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>

              {/* Back to login */}
              <Link to="/login" style={styles.backLink}>
                <ArrowLeft size={13} strokeWidth={2.5} />
                Return to Login
              </Link>
            </>
          )}
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
    maxWidth: 420,
  } as React.CSSProperties,

  // ── Brand ──
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

  // ── Card ──
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
    gap: 18,
  } as React.CSSProperties,

  // ── Heading ──
  heading: {
    textAlign: 'center',
    paddingBottom: 4,
  } as React.CSSProperties,

  headingTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 8px',
    letterSpacing: '-0.3px',
  } as React.CSSProperties,

  headingDesc: {
    fontSize: 13.5,
    color: '#9a9284',
    lineHeight: 1.6,
    margin: 0,
  } as React.CSSProperties,

  // ── Form ──
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    marginBottom: 14,
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

  inputShadow: [
    'inset 3px 3px 7px rgba(0,0,0,0.08)',
    'inset -2px -2px 5px rgba(255,255,255,0.95)',
  ].join(', '),

  inputFocusShadow: [
    'inset 3px 3px 7px rgba(0,0,0,0.1)',
    'inset -2px -2px 5px rgba(255,255,255,0.95)',
    '0 0 0 2.5px rgba(245,197,24,0.35)',
  ].join(', '),

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

  errMsg: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 2,
    marginLeft: 14,
  } as React.CSSProperties,

  // ── Notice ──
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: 'rgba(245,235,200,0.38)',
    borderRadius: 14,
    padding: '12px 14px',
    border: '1px solid rgba(210,190,130,0.25)',
    marginBottom: 18,
  } as React.CSSProperties,

  noticeText: {
    fontSize: 12.5,
    color: '#7a6f5a',
    lineHeight: 1.55,
    margin: 0,
    fontStyle: 'italic',
  } as React.CSSProperties,

  // ── CTA ──
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
    marginBottom: 4,
  } as React.CSSProperties,

  ctaDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  } as React.CSSProperties,

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

  // ── Back link ──
  backLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: '#9a9284',
    textDecoration: 'none',
    transition: 'color 0.15s',
    marginTop: 4,
  } as React.CSSProperties,

  // ── Success state ──
  successWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
    padding: '8px 0',
  } as React.CSSProperties,

  successIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#f0fdf4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(22,163,74,0.15)',
  } as React.CSSProperties,

  successTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  } as React.CSSProperties,

  successDesc: {
    fontSize: 13.5,
    color: '#9a9284',
    lineHeight: 1.6,
    margin: '0 0 8px',
    maxWidth: 300,
  } as React.CSSProperties,

  returnBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 24px',
    borderRadius: 50,
    background: '#f0eeea',
    boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.07), inset -1px -1px 4px rgba(255,255,255,0.95)',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a4a5a',
    textDecoration: 'none',
  } as React.CSSProperties,

  // ── Footer ──
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

  footerSep: {
    color: '#d8d4cf',
    fontSize: 11,
  } as React.CSSProperties,

  copy: {
    fontSize: 10.5,
    color: '#ccc8c2',
    marginTop: 8,
    letterSpacing: '0.02em',
  } as React.CSSProperties,
};
