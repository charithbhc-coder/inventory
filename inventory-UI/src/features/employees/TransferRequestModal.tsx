import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, ArrowRight, UserCheck, X } from 'lucide-react';
import { Item } from '@/services/item.service';
import toast from 'react-hot-toast';

// Simple API call for the transfer request
const createTransferRequest = async (itemId: string, payload: any) => {
  const token = localStorage.getItem('inventory_auth_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const response = await fetch(`${apiUrl}/transfer-requests/${itemId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit transfer request');
  }
  return response.json();
};

interface Props {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferRequestModal({ item, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<'PERSON' | 'DEPARTMENT' | 'COMPANY'>('PERSON');
  const [newAssignedToName, setNewAssignedToName] = useState('');
  const [newAssignedToEmployeeId, setNewAssignedToEmployeeId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for the transfer.');
      return;
    }
    if (targetType === 'PERSON' && !newAssignedToName.trim()) {
      toast.error('Please provide the new assignee name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransferRequest(item.id, {
        targetType,
        newAssignedToName: targetType === 'PERSON' ? newAssignedToName : undefined,
        newAssignedToEmployeeId: targetType === 'PERSON' ? newAssignedToEmployeeId : undefined,
        reason,
      });
      toast.success('Transfer request submitted to Super Admins');
      queryClient.invalidateQueries({ queryKey: ['items'] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 500, background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-dark)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Request Transfer</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{item.name} ({item.barcode})</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={20}/></button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          <form id="transfer-form" onSubmit={handleSubmit}>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Current Assignment</label>
              <div style={{ padding: 12, background: 'var(--bg-dark)', borderRadius: 10, border: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <UserCheck size={18} color="var(--text-muted)" />
                <span style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 600 }}>{item.assignedToName || 'Unassigned'}</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
               <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Transfer To</label>
               <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none', marginBottom: 12 }}
               >
                  <option value="PERSON">Another Employee</option>
                  <option value="DEPARTMENT">Department Only (Unassign from person)</option>
               </select>

               {targetType === 'PERSON' && (
                 <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                   <div style={{ flex: 1 }}>
                     <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>New Assignee Name</label>
                     <input
                       type="text"
                       required
                       value={newAssignedToName}
                       onChange={e => setNewAssignedToName(e.target.value)}
                       placeholder="e.g. Jane Doe"
                       style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none' }}
                     />
                   </div>
                   <div style={{ flex: 1 }}>
                     <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Employee ID (Optional)</label>
                     <input
                       type="text"
                       value={newAssignedToEmployeeId}
                       onChange={e => setNewAssignedToEmployeeId(e.target.value)}
                       placeholder="e.g. EMP-102"
                       style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none' }}
                     />
                   </div>
                 </div>
               )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Reason for Transfer <span style={{color: '#e11d48'}}>*</span></label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain why this asset is being transferred..."
                rows={3}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
            </div>
            
            <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
               <strong>Note:</strong> This request requires Super Admin approval. The transfer will only take effect once approved, and an audit trail will be maintained.
            </div>

          </form>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-dark)', display: 'flex', gap: 12, background: 'rgba(255,255,255,0.02)' }}>
           <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
             Cancel
           </button>
           <button type="submit" form="transfer-form" disabled={isSubmitting} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSubmitting ? 0.7 : 1 }}>
             <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit Request'}
           </button>
        </div>

      </div>
    </div>
  );
}
