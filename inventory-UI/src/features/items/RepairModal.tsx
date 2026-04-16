import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Wrench, Building, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';

interface RepairModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function RepairModal({ item, isOpen, onClose }: RepairModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    repairVendorName: '',
    repairNotes: '',
    sentToRepair: true
  });

  const mutation = useMutation({
    mutationFn: (dto: any) => itemService.markForRepair(item.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['item-timeline', item.id] });
      toast.success('Asset marked for repair');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to mark for repair')
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formData.repairNotes) {
      toast.error('Please provide repair notes');
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
            <div style={styles.iconBox}><Wrench size={20} /></div>
            <div>
              <h3 style={styles.title}>Send to Repair</h3>
              <p style={styles.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={styles.alert}>
              <AlertTriangle size={16} />
              <span>Asset status will be changed to <strong>"IN REPAIR"</strong></span>
            </div>

            <div>
              <label style={styles.label}>REPAIR VENDOR / SHOP NAME</label>
              <div style={styles.inputWrap}>
                <Building style={styles.inputIcon} size={16} />
                <input 
                  style={styles.input}
                  placeholder="e.g. Dell Service Center, local shop..."
                  value={formData.repairVendorName}
                  onChange={e => setFormData({ ...formData, repairVendorName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>REPAIR NOTES / FAULT DESCRIPTION</label>
              <textarea 
                style={styles.textarea}
                placeholder="Describe the issue and what needs fixing..."
                value={formData.repairNotes}
                onChange={e => setFormData({ ...formData, repairNotes: e.target.value })}
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.sentToRepair}
                onChange={e => setFormData({ ...formData, sentToRepair: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>Mark as physically sent out for repair</span>
            </label>
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
              className="btn btn-primary" 
              disabled={mutation.isPending}
              style={{ minWidth: 160 }}
            >
              {mutation.isPending ? 'Processing...' : 'Confirm Repair'}
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
    width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 197, 24, 0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)'
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  form: { padding: 24 },
  alert: {
    padding: '12px 16px', background: 'var(--color-warning-bg)', borderRadius: 8,
    border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--color-warning)',
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
  textarea: {
    width: '100%', padding: 12, background: 'var(--color-surface-2)', 
    border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, 
    color: 'var(--color-text-primary)', outline: 'none', minHeight: 100, resize: 'none' as const
  },
  footer: { marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }
};
