import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService } from '@/services/item.service';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    name: string;
    employeeId: string;
  };
}

export default function EditEmployeeModal({ isOpen, onClose, employee }: EditEmployeeModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    newName: employee.name,
    newEmployeeId: employee.employeeId
  });

  const mutation = useMutation({
    mutationFn: (dto: { oldName: string; newName: string; newEmployeeId?: string | null }) => 
      itemService.updateEmployee(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Employee details updated globally');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update employee')
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formData.newName.trim()) {
      toast.error('Employee name cannot be empty');
      return;
    }
    mutation.mutate({
      oldName: employee.name,
      newName: formData.newName.trim(),
      newEmployeeId: formData.newEmployeeId.trim() || null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><User size={20} /></div>
            <div>
              <h3 style={styles.title}>Edit Employee</h3>
              <p style={styles.subtitle}>Update details globally across all assigned assets</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 12, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
              Note: This will change the employee's name on all currently assigned and past items in the system. Use this to fix typos or update records.
            </div>

            <div>
              <label style={styles.label}>EMPLOYEE NAME</label>
              <div style={styles.inputWrap}>
                <User style={styles.inputIcon} size={16} />
                <input
                  style={styles.input}
                  placeholder="Enter employee name..."
                  value={formData.newName}
                  onChange={e => setFormData({ ...formData, newName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>EMPLOYEE ID (Optional)</label>
              <div style={styles.inputWrap}>
                <Hash style={styles.inputIcon} size={16} />
                <input
                  style={styles.input}
                  placeholder="Enter employee ID..."
                  value={formData.newEmployeeId}
                  onChange={e => setFormData({ ...formData, newEmployeeId: e.target.value })}
                />
              </div>
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
              className="btn btn-primary"
              disabled={mutation.isPending}
              style={{ minWidth: 160 }}
            >
              {mutation.isPending ? 'Updating...' : 'Save Changes'}
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
    width: '100%', maxWidth: 440, background: 'var(--bg-surface, var(--color-surface))',
    borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
  },
  header: {
    padding: '20px 24px', background: 'var(--bg-sidebar, var(--color-sidebar))', color: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 197, 24, 0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-yellow, var(--color-accent))'
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  form: { padding: 24, background: 'var(--bg-card, var(--color-surface))' },
  label: { display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800, color: 'var(--text-muted, var(--color-text-muted))', letterSpacing: '0.05em' },
  inputWrap: { position: 'relative' as const },
  inputIcon: { position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, var(--color-text-muted))' },
  input: {
    width: '100%', padding: '12px 14px 12px 42px', background: 'var(--bg-dark, var(--color-surface-2))',
    border: '1px solid var(--border-dark, var(--color-border))', borderRadius: 10, fontSize: 13,
    color: 'var(--text-main, var(--color-text-primary))', outline: 'none', boxSizing: 'border-box' as const
  },
  footer: { marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-dark, var(--color-border))', display: 'flex', justifyContent: 'flex-end', gap: 12 }
};
