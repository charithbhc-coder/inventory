import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface AuthShellProps {
  leftContent: React.ReactNode;
  children: React.ReactNode;
  copyright?: string;
}

export default function AuthShell({ leftContent, children, copyright }: AuthShellProps) {
  return (
    <div className="auth-shell">
      {/* Left panel */}
      <div className="auth-panel-left">
        {leftContent}
        <div className="auth-footer">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Security Audit</a>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-panel-right">
        <div className="auth-form-container">
          {children}
        </div>
        <div className="auth-right-footer">
          {copyright ?? '© 2026 KTMG Systems. KTMG-Vault Secure Layer.'}
        </div>
      </div>
    </div>
  );
}

export function SecurityBadge({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <ShieldCheck size={16} color="var(--color-accent)" />
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{text}</span>
    </div>
  );
}

export function BrandLogo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const isLg = size === 'lg';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isLg ? 32 : 0 }}>
      <div style={{
        width: isLg ? 56 : 36,
        height: isLg ? 56 : 36,
        background: 'var(--color-accent)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Lock size={isLg ? 26 : 18} color="#0d1b2a" strokeWidth={2.5} />
      </div>
      {!isLg && (
        <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>KTMG-Vault</span>
      )}
    </div>
  );
}
