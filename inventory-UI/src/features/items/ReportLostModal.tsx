import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertOctagon, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';

interface ReportLostModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportLostModal({ item, isOpen, onClose }: ReportLostModalProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: (notes: string) => itemService.reportLost(item.id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item-timeline', item.id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Asset reported as missing');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to report as lost')
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error('Please provide details about when/how it was lost');
      return;
    }
    mutation.mutate(notes);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><AlertOctagon size={20} /></div>
            <div>
              <h3 style={styles.title}>Report Missing / Lost</h3>
              <p style={styles.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={styles.alert}>
              <AlertOctagon size={16} />
              <span>Asset status will be changed to <strong style={{color: 'var(--accent-red)'}}>"LOST"</strong></span>
            </div>

            <div>
              <label style={styles.label}>DISAPPEARANCE DETAILS</label>
              <textarea 
                style={styles.textarea}
                placeholder="Where was it last seen? When was it noticed missing? Any relevant details for the audit trail..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-dark)' }}>
              <HelpCircle size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Reporting an asset as lost will automatically unassign it from any person or department. This action will trigger an <strong>Active Alert</strong> on the dashboard.
              </p>
            </div>
          </div>

          <div style={styles.footer}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary" 
              style={{ fontSize: '14px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-danger" 
              disabled={mutation.isPending}
              style={{ minWidth: 160 }}
            >
              {mutation.isPending ? 'Processing...' : 'Report as Lost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', 
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', 
    justifyContent: 'center', zIndex: 1100
  },
  modal: {
    width: '100%', maxWidth: 480, background: 'var(--color-surface)', 
    borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)'
  },
  header: {
    padding: '20px 24px', background: 'var(--color-sidebar)', color: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, background: 'var(--color-danger-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)'
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  form: { padding: 24 },
  alert: {
    padding: '12px 16px', background: 'var(--color-danger-bg)', borderRadius: 8,
    border: '1px solid var(--color-border)', color: 'var(--color-danger)',
    fontSize: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
    fontWeight: 600
  },
  label: { display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: '0.05em' },
  textarea: {
    width: '100%', padding: 12, background: 'var(--color-surface-2)', 
    border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, 
    color: 'var(--color-text-primary)', outline: 'none', minHeight: 120, resize: 'none' as const
  },
  footer: { marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }
};
