import React, { type CSSProperties } from 'react';
import logo from '@/assets/logo.png';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div style={styles.page}>
      {/* Grain overlay */}
      <div style={styles.grain} />

      <div style={styles.wrapper}>
        {/* ── Brand mark ── */}
        <div style={styles.brand}>
          <div style={styles.logoCircle}>
            <img
              src={logo}
              alt="KTMG-Vault"
              style={{ height: 110, objectFit: 'contain' }}
            />
          </div>
          <h1 style={styles.brandName}>KTMG-Vault</h1>
          <p style={styles.brandSub}>Secure Enterprise Access Layer</p>
        </div>

        {/* ── Page Content (Card) ── */}
        {children}

        {/* ── Footer links ── */}
        <div style={styles.footer}>
          <a href="#" style={styles.footerLink}>Privacy Policy</a>
          <span style={styles.footerSep}>|</span>
          <a href="#" style={styles.footerLink}>Terms of Service</a>
          <span style={styles.footerSep}>|</span>
          <a href="#" style={styles.footerLink}>Security Audit</a>
        </div>
        <p style={styles.copy}>© 2026 KTMG Systems. KTMG-Vault Secure Layer.</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'linear-gradient(135deg, #f7f3ec 0%, #f0eeeb 40%, #ebebeb 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start', // Top-anchored
    alignItems: 'center',
    padding: '80px 16px 40px', // Fixed top padding
    position: 'relative',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowY: 'auto',
    scrollbarGutter: 'stable',
  } as CSSProperties,

  grain: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '256px 256px',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.6,
  } as CSSProperties,

  wrapper: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    gap: 0,
  } as CSSProperties,

  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 32, // Fixed spacing to card
    gap: 0,
  } as CSSProperties,

  logoCircle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -12,
  } as CSSProperties,

  brandName: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: '#1a1a2e',
    margin: 0,
    lineHeight: 1.1,
    marginBottom: 4,
  } as CSSProperties,

  brandSub: {
    fontSize: 13,
    color: '#6d7278',
    fontWeight: 500,
    letterSpacing: '0.02em',
    margin: 0,
  } as CSSProperties,

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  } as CSSProperties,

  footerLink: {
    fontSize: 11,
    letterSpacing: '0.06em',
    fontWeight: 500,
    color: '#bbb5ad',
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
    transition: 'color 0.15s',
  } as CSSProperties,

  footerSep: {
    color: '#d8d4cf',
    fontSize: 11,
    userSelect: 'none',
  } as CSSProperties,

  copy: {
    fontSize: 10.5,
    color: '#ccc8c2',
    marginTop: 8,
    letterSpacing: '0.02em',
  } as CSSProperties,
};
