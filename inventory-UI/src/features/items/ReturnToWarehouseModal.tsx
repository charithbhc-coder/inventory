import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';

interface ReturnToWarehouseModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReturnToWarehouseModal({ item, isOpen, onClose }: ReturnToWarehouseModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => itemService.unassignItem(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['item-timeline', item.id] });
      toast.success('Asset returned to warehouse');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to return asset')
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><Building size={20} /></div>
            <div>
              <h3 style={styles.title}>Return to Warehouse</h3>
              <p style={styles.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <div style={styles.body}>
          <div style={styles.alert}>
            <AlertCircle size={20} />
            <p style={{ margin: 0 }}>
              Are you sure you want to return this asset to the warehouse? 
              <strong> This will clear the current assignment.</strong>
            </p>
          </div>
          
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 600 }}>
              Asset will be marked as <span style={{ color: 'var(--color-accent)' }}>WAREHOUSE</span> status.
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
            type="button" 
            onClick={() => mutation.mutate()}
            className="btn btn-primary" 
            disabled={mutation.isPending}
            style={{ minWidth: 140 }}
          >
            {mutation.isPending ? 'Processing...' : 'Confirm Return'}
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
    justifyContent: 'center', zIndex: 1100
  },
  modal: {
    width: '100%', maxWidth: 420, background: 'var(--color-surface)', 
    borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)'
  },
  header: {
    padding: '20px 24px', background: 'var(--color-sidebar)', color: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  body: { padding: 24 },
  alert: {
    padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 12,
    border: '1px solid rgba(59, 130, 246, 0.1)', color: '#3b82f6',
    fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 12, lineHeight: 1.5
  },
  footer: { 
    padding: '16px 24px', background: 'rgba(255,255,255,0.02)', 
    borderTop: '1px solid var(--color-border)', display: 'flex', 
    justifyContent: 'flex-end', gap: 12 
  }
};
