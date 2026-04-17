import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Record',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  loading = false,
}: DeleteConfirmationModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.18s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header bar accent */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />

        {/* Content */}
        <div style={{ padding: '28px 28px 24px' }}>

          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={handleClose}
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-dark)',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Icon + title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              {title}
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 360 }}>
              {message}
            </p>
          </div>

          {/* Reason textarea */}
          <div style={{ marginBottom: 8 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--text-muted)',
            }}>
              Reason for deletion <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              autoFocus
              rows={3}
              placeholder="e.g. Obsolete schedule, incorrect recipient list..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-dark)',
                border: `1px solid ${reason.trim() ? 'rgba(239,68,68,0.4)' : 'var(--border-dark)'}`,
                borderRadius: 10,
                color: 'var(--text-main)',
                fontSize: 13.5,
                fontFamily: 'Inter, system-ui, sans-serif',
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
                boxShadow: reason.trim() ? '0 0 0 3px rgba(239,68,68,0.08)' : 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)'; }}
              onBlur={e => { if (!reason.trim()) { e.currentTarget.style.borderColor = 'var(--border-dark)'; e.currentTarget.style.boxShadow = 'none'; }}}
            />
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              ⚠ This reason will be permanently recorded in the system audit logs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '16px 28px 24px',
        }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid var(--border-dark)',
              borderRadius: 50,
              color: 'var(--text-main)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 20px',
              background: !reason.trim() || loading
                ? 'rgba(239,68,68,0.3)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: 50,
              color: !reason.trim() || loading ? 'rgba(255,255,255,0.5)' : 'white',
              fontSize: 13,
              fontWeight: 800,
              cursor: !reason.trim() || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: reason.trim() && !loading ? '0 4px 16px rgba(239,68,68,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (reason.trim() && !loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(239,68,68,0.45)';
                e.currentTarget.style.filter = 'brightness(1.05)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = reason.trim() && !loading ? '0 4px 16px rgba(239,68,68,0.35)' : 'none';
              e.currentTarget.style.filter = 'none';
            }}
          >
            {loading ? (
              <span style={{ opacity: 0.7 }}>Deleting…</span>
            ) : (
              <><Trash2 size={14} /> Delete Record</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
