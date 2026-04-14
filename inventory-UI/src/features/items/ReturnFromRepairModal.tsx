import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, History, MessageSquare, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';
import { ItemCondition } from '@/types';

interface ReturnFromRepairModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReturnFromRepairModal({ item, isOpen, onClose }: ReturnFromRepairModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    condition: item.condition || ItemCondition.GOOD,
    repairNotes: ''
  });

  const mutation = useMutation({
    mutationFn: (dto: any) => itemService.returnFromRepair(item.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['item-timeline', item.id] });
      toast.success('Asset returned from repair');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to process return')
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><CheckCircle2 size={20} /></div>
            <div>
              <h3 style={styles.title}>Return from Repair</h3>
              <p style={styles.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={styles.alert}>
              <History size={16} />
              <span>Restoring asset to functional inventory status</span>
            </div>

            <div>
              <label style={styles.label}>ASSET CONDITION (POST-REPAIR)</label>
              <div style={styles.inputWrap}>
                <ShieldCheck style={styles.inputIcon} size={16} />
                <select 
                  style={styles.select}
                  value={formData.condition}
                  onChange={e => setFormData({ ...formData, condition: e.target.value as ItemCondition })}
                >
                  {Object.values(ItemCondition).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={styles.label}>FINAL REPAIR NOTES / SUMMARY</label>
              <div style={styles.inputWrap}>
                <MessageSquare style={{ ...styles.inputIcon, top: 12, transform: 'none' }} size={16} />
                <textarea 
                  style={styles.textarea}
                  placeholder="Summarize the repair work done, cost, or any components replaced..."
                  value={formData.repairNotes}
                  onChange={e => setFormData({ ...formData, repairNotes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} className="outline-btn" style={{ padding: '10px 20px' }}>Cancel</button>
            <button 
              type="submit" 
              className="primary-btn" 
              disabled={mutation.isPending}
              style={{ 
                padding: '10px 30px', fontWeight: 800,
                background: 'var(--accent-green)', color: '#fff'
              }}
            >
              {mutation.isPending ? 'Processing...' : 'Complete Return'}
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
    width: '100%', maxWidth: 480, background: 'var(--bg-card)', 
    borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
  },
  header: {
    padding: '20px 24px', background: 'var(--bg-sidebar)', color: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)'
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  form: { padding: 24 },
  alert: {
    padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8,
    border: '1px solid rgba(16, 185, 129, 0.2)', color: '#059669',
    fontSize: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
    fontWeight: 600
  },
  label: { display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' },
  inputWrap: { position: 'relative' as const },
  inputIcon: { position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  select: {
    width: '100%', padding: '12px 14px 12px 42px', background: 'var(--bg-dark)', 
    border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, 
    color: 'var(--text-main)', outline: 'none', cursor: 'pointer'
  },
  textarea: {
    width: '100%', padding: '12px 14px 12px 42px', background: 'var(--bg-dark)', 
    border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, 
    color: 'var(--text-main)', outline: 'none', minHeight: 120, resize: 'none' as const
  },
  footer: { marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'flex-end', gap: 12 }
};
