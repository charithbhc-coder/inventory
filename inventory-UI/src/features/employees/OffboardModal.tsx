import { useState } from 'react';
import { PowerOff, AlertTriangle, Printer, Loader2, CheckCircle2 } from 'lucide-react';
import { Item, itemService } from '@/services/item.service';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  items: Item[];
  onPrintHandover: () => void;
}

export default function OffboardModal({ isOpen, onClose, employeeName, items, onPrintHandover }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'PROMPT' | 'CONFIRM' | 'PROCESSING' | 'SUCCESS'>('PROMPT');
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleBulkReturn = async () => {
    setStep('PROCESSING');
    setProgress(0);

    let successCount = 0;
    
    // Process sequentially to avoid overwhelming the API and to show progress
    for (let i = 0; i < items.length; i++) {
      try {
        await itemService.moveToWarehouse(items[i].id, `Bulk offboarding: Returned from ${employeeName}`);
        successCount++;
        setProgress(Math.round(((i + 1) / items.length) * 100));
      } catch (error) {
        console.error(`Failed to return item ${items[i].id}:`, error);
        toast.error(`Failed to return ${items[i].name}`);
      }
    }

    if (successCount === items.length) {
      toast.success(`Successfully offboarded ${employeeName}`);
    } else if (successCount > 0) {
      toast.success(`Partially offboarded ${employeeName}. ${successCount}/${items.length} returned.`);
    }

    queryClient.invalidateQueries({ queryKey: ['items'] });
    setStep('SUCCESS');
  };

  const handleClose = () => {
    setStep('PROMPT');
    setProgress(0);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.4)', border: '1px solid var(--border-dark)' }}>
        
        {/* PROMPT STEP */}
        {step === 'PROMPT' && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#3b82f6' }}>
               <Printer size={32} />
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>Print Handover Form?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Before returning all {items.length} assets from <strong>{employeeName}</strong>, have you printed the Handover Form for them to sign?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { onPrintHandover(); setStep('CONFIRM'); }} style={{ padding: '12px 20px', borderRadius: 12, background: '#3b82f6', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                 Yes, Print Handover Form
              </button>
              <button onClick={() => setStep('CONFIRM')} style={{ padding: '12px 20px', borderRadius: 12, background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                 Skip & Continue to Offboard
              </button>
              <button onClick={handleClose} style={{ padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                 Cancel
              </button>
            </div>
          </div>
        )}

        {/* CONFIRM STEP */}
        {step === 'CONFIRM' && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(225, 29, 72, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#e11d48' }}>
               <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>Confirm Bulk Offboard</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              You are about to unassign <strong>{items.length} assets</strong> from <strong>{employeeName}</strong> and return them to the Warehouse. This action will be recorded in the audit log.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
               <button onClick={handleClose} style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
               </button>
               <button onClick={handleBulkReturn} style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: '#e11d48', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <PowerOff size={16} /> Confirm Return
               </button>
            </div>
          </div>
        )}

        {/* PROCESSING STEP */}
        {step === 'PROCESSING' && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Loader2 size={48} className="spin" color="var(--accent-yellow)" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Processing Offboarding</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted)' }}>Returning assets to warehouse...</p>
            <div style={{ width: '100%', height: 6, background: 'var(--bg-dark)', borderRadius: 10, overflow: 'hidden' }}>
               <div style={{ height: '100%', background: 'var(--accent-yellow)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{progress}% Complete</p>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === 'SUCCESS' && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10b981' }}>
               <CheckCircle2 size={32} />
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>Offboarding Complete</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              All {items.length} assets have been successfully returned from {employeeName}.
            </p>
            <button onClick={handleClose} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
               Close
            </button>
          </div>
        )}

      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
