import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';

interface PermanentDeleteModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function PermanentDeleteModal({ item, isOpen, onClose }: PermanentDeleteModalProps) {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');

  const mutation = useMutation({
    mutationFn: () => itemService.permanentDelete(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Asset permanently deleted');
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete asset'),
  });

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE';

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={handleClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><Trash2 size={18} /></div>
            <h3 style={styles.title}>Permanently Delete Asset</h3>
          </div>
          <button onClick={handleClose} style={styles.closeBtn}><X size={18} /></button>
        </div>

        <div style={styles.body}>
          <div style={styles.warning}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>This <strong>permanently removes</strong> the asset and its history. It cannot be undone from the app.</span>
          </div>

          <div style={styles.assetBox}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.barcode}</div>
          </div>

          <label style={styles.label}>Type <strong>DELETE</strong> to confirm</label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
            style={styles.input}
          />
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={handleClose} className="btn btn-secondary" style={{ fontSize: 14 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canDelete || mutation.isPending}
            style={{
              minWidth: 130, padding: '10px 0', borderRadius: 10, border: 'none',
              background: '#e11d48', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: (!canDelete || mutation.isPending) ? 'not-allowed' : 'pointer',
              opacity: (!canDelete || mutation.isPending) ? 0.5 : 1,
            }}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete Forever'}
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
    width: '100%', maxWidth: 400, background: 'var(--color-surface)',
    borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
  },
  header: {
    padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 9, background: 'rgba(225, 29, 72, 0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48',
  },
  title: { margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-main)' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  body: { padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 14 },
  warning: {
    padding: '12px 14px', background: 'rgba(225, 29, 72, 0.07)', borderRadius: 10,
    border: '1px solid rgba(225, 29, 72, 0.22)', color: '#e11d48',
    fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.45,
  },
  assetBox: {
    padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: 10,
    border: '1px solid var(--border-dark)',
  },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)',
    background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none',
  },
  footer: {
    padding: '14px 20px', background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid var(--color-border)', display: 'flex',
    justifyContent: 'flex-end', gap: 10,
  },
};
