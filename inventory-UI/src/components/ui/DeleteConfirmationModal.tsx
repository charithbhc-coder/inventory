import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import Button from './Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Record',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  loading = false,
}: DeleteConfirmationModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md overflow-hidden bg-[var(--bg-card)] border border-[var(--border-dark)] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
      >
        {/* Header */}
        <div className="relative p-6 pb-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center justify-center w-14 h-14 mx-auto bg-red-500/10 rounded-2xl text-[var(--accent-red)]">
            <AlertTriangle size={28} />
          </div>
          
          <h3 className="mt-4 text-xl font-800 text-center text-[var(--text-main)]">
            {title}
          </h3>
          <p className="mt-2 text-sm text-center text-[var(--text-muted)] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 pt-5">
          <label className="block mb-2 text-xs font-800 uppercase tracking-wider text-[var(--text-muted)]">
            Reason for deletion <span className="text-[var(--accent-red)]">*</span>
          </label>
          <textarea
            autoFocus
            rows={3}
            className="w-full p-3 text-sm bg-[var(--bg-dark)] border border-[var(--border-dark)] rounded-xl text-[var(--text-main)] outline-none focus:border-[var(--accent-red)] focus:ring-1 focus:ring-[var(--accent-red)]/20 transition-all placeholder:text-[var(--text-muted)]"
            placeholder="e.g. Obsolete schedule, incorrect recipient list..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="mt-2 text-[11px] text-[var(--text-muted)] italic">
            * This reason will be recorded in the system audit logs.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <Button 
            variant="secondary" 
            className="flex-1 rounded-xl font-700"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dark)' }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            className="flex-1 rounded-xl font-800"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
            loading={loading}
            style={{ 
              backgroundColor: 'var(--accent-red)', 
              color: 'white',
              boxShadow: reason.trim() ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none'
            }}
          >
            <Trash2 size={16} className="mr-2" />
            Delete Record
          </Button>
        </div>
      </div>
    </div>
  );
}
