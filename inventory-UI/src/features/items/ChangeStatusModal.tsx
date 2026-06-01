import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
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

  const mutation = useMutation({
    mutationFn: () => itemService.changeStatus(item.id, status),
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
    onClose();
  };

  const handleSubmit = () => {
    if (!status) { toast.error('Please choose a status.'); return; }
    if (status === item.status) { toast.error('That is already the current status.'); return; }
    mutation.mutate();
  };

  if (!isOpen) return null;

  const options = STATUS_OPTIONS.filter(o => o.value !== item.status);
  const newLabel = STATUS_OPTIONS.find(o => o.value === status)?.label;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={handleClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Change Status</h3>
          <button onClick={handleClose} style={styles.closeBtn}><X size={18} /></button>
        </div>

        <div style={styles.body}>
          <select value={status} onChange={e => setStatus(e.target.value)} style={styles.select} autoFocus>
            <option value="">Select a status…</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div style={styles.warning}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>
              {status
                ? <>Change status to <strong>{newLabel}</strong>? This won't change the assignment.</>
                : <>Are you sure you want to change this asset's status?</>}
            </span>
          </div>
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={handleClose} className="btn btn-secondary" style={{ fontSize: 14 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={mutation.isPending}
            style={{ minWidth: 120 }}
          >
            {mutation.isPending ? 'Saving…' : 'Confirm'}
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
    width: '100%', maxWidth: 380, background: 'var(--color-surface)',
    borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
  },
  header: {
    padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-main)' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  body: { padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 14 },
  select: {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)',
    background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none',
  },
  warning: {
    padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 10,
    border: '1px solid rgba(245, 158, 11, 0.25)', color: '#b45309',
    fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1.45,
  },
  footer: {
    padding: '14px 20px', background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid var(--color-border)', display: 'flex',
    justifyContent: 'flex-end', gap: 10,
  },
};
