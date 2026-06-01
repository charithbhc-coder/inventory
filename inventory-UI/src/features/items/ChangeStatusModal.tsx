import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, SlidersHorizontal, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';

interface ChangeStatusModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

// Statuses settable via manual change (must match backend MANUAL_STATUSES).
// DISPOSED and LOST are intentionally excluded — they use their own workflows.
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'WAREHOUSE', label: 'In Stock' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'IN_REPAIR', label: 'In Repair' },
  { value: 'SENT_TO_REPAIR', label: 'Sent to Repair' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
];

export default function ChangeStatusModal({ item, isOpen, onClose }: ChangeStatusModalProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => itemService.changeStatus(item.id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['item-timeline', item.id] });
      toast.success('Asset status updated');
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });

  const handleClose = () => {
    setStatus('');
    setNotes('');
    onClose();
  };

  const handleSubmit = () => {
    if (!status) { toast.error('Please choose a status.'); return; }
    if (status === item.status) { toast.error('That is already the current status.'); return; }
    if (!notes.trim()) { toast.error('Please provide a reason for the change.'); return; }
    mutation.mutate();
  };

  if (!isOpen) return null;

  const options = STATUS_OPTIONS.filter(o => o.value !== item.status);
  const currentLabel = STATUS_OPTIONS.find(o => o.value === item.status)?.label
    || (item.status ? item.status.replace(/_/g, ' ') : 'Unknown');

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={handleClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><SlidersHorizontal size={20} /></div>
            <div>
              <h3 style={styles.title}>Change Status</h3>
              <p style={styles.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={handleClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <div style={styles.body}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Current Status</label>
            <div style={styles.currentPill}>{currentLabel}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>New Status <span style={{ color: '#e11d48' }}>*</span></label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={styles.select}>
              <option value="">Select a status…</option>
              {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Reason <span style={{ color: '#e11d48' }}>*</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why is the status being changed manually?"
              rows={3}
              style={styles.textarea}
            />
          </div>

          <div style={styles.alert}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0 }}>
              This changes the status only — it does not change the assignment. The change is recorded in the asset timeline.
            </p>
          </div>
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={handleClose} className="btn btn-secondary" style={{ fontSize: '14px' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={mutation.isPending}
            style={{ minWidth: 140 }}
          >
            {mutation.isPending ? 'Saving…' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1100, padding: 16,
  },
  modal: {
    width: '100%', maxWidth: 440, background: 'var(--color-surface)',
    borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
  },
  header: {
    padding: '20px 24px', background: 'var(--color-sidebar)', color: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  body: { padding: 24 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' as const },
  currentPill: {
    display: 'inline-flex', padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 800,
    background: 'rgba(71, 85, 105, 0.12)', color: '#475569', textTransform: 'uppercase' as const,
  },
  select: {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)',
    background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none',
  },
  textarea: {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)',
    background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none', resize: 'vertical' as const,
  },
  alert: {
    padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.15)', color: '#818cf8',
    fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 12, lineHeight: 1.5,
  },
  footer: {
    padding: '16px 24px', background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid var(--color-border)', display: 'flex',
    justifyContent: 'flex-end', gap: 12,
  },
};
