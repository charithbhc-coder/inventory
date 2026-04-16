import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Info, AlertOctagon } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';

interface DisposeModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function DisposeModal({ item, isOpen, onClose }: DisposeModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    disposalReason: '',
    disposalMethod: 'SCRAPPED',
    disposalNotes: ''
  });

  const mutation = useMutation({
    mutationFn: (dto: any) => itemService.disposeItem(item.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['item-timeline', item.id] });
      toast.success('Asset disposed successfully');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to dispose asset')
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formData.disposalReason) {
      toast.error('Please provide a reason for disposal');
      return;
    }
    mutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><Trash2 size={20} /></div>
            <div>
              <h3 style={styles.title}>Dispose Asset</h3>
              <p style={styles.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={styles.alert}>
              <AlertOctagon size={16} />
              <span>Asset will be marked as <strong>"DISPOSED"</strong> and archived. This action is recorded in audit logs.</span>
            </div>

            <div>
              <label style={styles.label}>DISPOSAL REASON</label>
              <div style={styles.inputWrap}>
                <Info style={styles.inputIcon} size={16} />
                <input 
                  style={styles.input}
                  placeholder="e.g. End of life, accidental damage..."
                  value={formData.disposalReason}
                  onChange={e => setFormData({ ...formData, disposalReason: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>DISPOSAL METHOD</label>
              <select 
                style={styles.inputSimple}
                value={formData.disposalMethod}
                onChange={e => setFormData({ ...formData, disposalMethod: e.target.value })}
              >
                <option value="SCRAPPED">Scrapped / Destroyed</option>
                <option value="SOLD">Sold</option>
                <option value="DONATED">Donated</option>
                <option value="RECYCLED">Recycled</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>ADDITIONAL DISPOSAL NOTES</label>
              <textarea 
                style={styles.textarea}
                placeholder="Any further details about the disposal process..."
                value={formData.disposalNotes}
                onChange={e => setFormData({ ...formData, disposalNotes: e.target.value })}
              />
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
              {mutation.isPending ? 'Disposing...' : 'Confirm Disposal'}
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
  inputWrap: { position: 'relative' as const },
  inputIcon: { position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' },
  input: {
    width: '100%', padding: '12px 14px 12px 42px', background: 'var(--color-surface-2)', 
    border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, 
    color: 'var(--color-text-primary)', outline: 'none'
  },
  inputSimple: {
    width: '100%', padding: '12px 14px', background: 'var(--color-surface-2)', 
    border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, 
    color: 'var(--color-text-primary)', outline: 'none'
  },
  textarea: {
    width: '100%', padding: 12, background: 'var(--color-surface-2)', 
    border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, 
    color: 'var(--color-text-primary)', outline: 'none', minHeight: 100, resize: 'none' as const
  },
  footer: { marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }
};
