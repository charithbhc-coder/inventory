import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ClipboardList, Upload, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { disposalRequestService } from '@/services/disposal-request.service';
import { DisposalCondition, DisposalMethod } from '@/types';
import { Item } from '@/services/item.service';

interface Props {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const CONDITION_LABELS: Record<DisposalCondition, string> = {
  BEYOND_REPAIR: 'Beyond Repair',
  OBSOLETE: 'Obsolete / End of Life',
  UNUSED: 'Unused / Surplus',
  PHYSICALLY_DAMAGED: 'Physically Damaged',
};

const METHOD_LABELS: Record<DisposalMethod, string> = {
  SCRAPPED: 'Scrapped / Destroyed',
  DONATED: 'Donated',
  RECYCLED: 'Recycled',
  SOLD: 'Sold',
  RETURNED_TO_VENDOR: 'Returned to Vendor',
};

export default function RequestDisposalModal({ item, isOpen, onClose, onSubmitted }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    disposalReason: '',
    disposalCondition: '' as DisposalCondition | '',
    technicalEvaluation: '',
    proposedMethod: '' as DisposalMethod | '',
    notes: '',
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      let evidencePhotoUrls: string[] | undefined;
      if (photoFiles.length > 0) {
        setUploadingPhotos(true);
        try {
          evidencePhotoUrls = await Promise.all(
            photoFiles.map(f => disposalRequestService.uploadPhoto(f))
          );
        } finally {
          setUploadingPhotos(false);
        }
      }
      return disposalRequestService.create({
        itemId: item.id,
        disposalReason: form.disposalReason,
        disposalCondition: form.disposalCondition as DisposalCondition,
        technicalEvaluation: form.technicalEvaluation,
        proposedMethod: form.proposedMethod as DisposalMethod,
        evidencePhotoUrls,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposal-requests'] });
      queryClient.refetchQueries({ queryKey: ['disposal-check', item.id] });
      onSubmitted?.();
      toast.success('Disposal request submitted for review');
      handleClose();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Failed to submit disposal request'),
  });

  const handleClose = () => {
    setForm({ disposalReason: '', disposalCondition: '', technicalEvaluation: '', proposedMethod: '', notes: '' });
    setPhotoFiles([]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.disposalCondition) { toast.error('Select a disposal condition'); return; }
    if (!form.disposalReason.trim()) { toast.error('Disposal reason is required'); return; }
    if (!form.technicalEvaluation.trim()) { toast.error('Technical evaluation is required'); return; }
    if (!form.proposedMethod) { toast.error('Select a proposed disposal method'); return; }
    mutation.mutate();
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(prev => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  };

  if (!isOpen) return null;

  const isSubmitting = mutation.isPending || uploadingPhotos;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 540;

  return (
    <div
      style={{ ...s.overlay, alignItems: isMobile ? 'flex-end' : 'center', padding: isMobile ? 0 : '16px' }}
      onClick={handleClose}
    >
      <div className="disposal-modal-wrap" onClick={e => e.stopPropagation()}>

        {/* Sticky header — outside the scroll area */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={s.iconBox}><ClipboardList size={20} /></div>
            <div style={{ minWidth: 0 }}>
              <h3 style={s.title}>Request Disposal</h3>
              <p style={s.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={handleClose} style={s.closeBtn} aria-label="Close"><X size={20} /></button>
        </div>

        {/* Scrollable body */}
        <div className="disposal-modal-body">
          <form onSubmit={handleSubmit} style={s.form}>

            {/* Info alert */}
            <div style={s.alert}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>A disposal request will be submitted for review and approval. The asset will not be disposed until all approvals are complete.</span>
            </div>

            {/* Disposal Condition */}
            <div>
              <label style={s.label}>DISPOSAL CONDITION <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select
                style={s.select}
                value={form.disposalCondition}
                onChange={e => setForm(f => ({ ...f, disposalCondition: e.target.value as DisposalCondition }))}
              >
                <option value="">— Select condition —</option>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Disposal Reason */}
            <div>
              <label style={s.label}>DISPOSAL REASON <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                style={s.input}
                placeholder="Brief reason (e.g. CPU burnt out, no longer functional)"
                value={form.disposalReason}
                onChange={e => setForm(f => ({ ...f, disposalReason: e.target.value }))}
              />
            </div>

            {/* Technical Evaluation */}
            <div>
              <label style={s.label}>TECHNICAL EVALUATION <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <textarea
                style={{ ...s.textarea, minHeight: 100 }}
                placeholder="Describe the technical issues found, repair attempts made, and why the asset cannot be recovered..."
                value={form.technicalEvaluation}
                onChange={e => setForm(f => ({ ...f, technicalEvaluation: e.target.value }))}
              />
            </div>

            {/* Proposed Method */}
            <div>
              <label style={s.label}>PROPOSED DISPOSAL METHOD <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select
                style={s.select}
                value={form.proposedMethod}
                onChange={e => setForm(f => ({ ...f, proposedMethod: e.target.value as DisposalMethod }))}
              >
                <option value="">— Select method —</option>
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Photo Evidence */}
            <div>
              <label style={s.label}>EVIDENCE PHOTOS (optional, max 5)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {photoFiles.map((f, i) => (
                  <div key={i} style={s.photoRow}>
                    <span style={s.photoName}>{f.name}</span>
                    <button type="button" onClick={() => setPhotoFiles(prev => prev.filter((_, j) => j !== i))} style={s.removeBtn}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {photoFiles.length < 5 && (
                  <label style={s.uploadBtn}>
                    <Upload size={14} />
                    <span>Add Photo</span>
                    <input type="file" accept="image/*,application/pdf" multiple onChange={handleFileAdd} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={s.label}>ADDITIONAL NOTES (optional)</label>
              <textarea
                style={s.textarea}
                placeholder="Any extra context for the reviewer..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Footer — inside scroll so it's always reachable */}
            <div style={s.footer}>
              <button type="button" onClick={handleClose} className="btn btn-secondary" style={{ fontSize: 14 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: 180, fontSize: 14 }}>
                {isSubmitting ? (uploadingPhotos ? 'Uploading photos...' : 'Submitting...') : 'Submit for Approval'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '16px',
  },
  header: {
    padding: '18px 24px',
    background: 'var(--color-sidebar)',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    gap: 12,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6, flexShrink: 0, display: 'flex', padding: 4 },
  form: { padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 20 },
  alert: { padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-secondary)', fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 600, lineHeight: 1.5 },
  label: { display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: '0.05em' },
  input: { width: '100%', padding: '12px 14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '12px 14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', minHeight: 72, resize: 'none' as const, boxSizing: 'border-box' as const },
  photoRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)', gap: 8 },
  photoName: { fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 },
  removeBtn: { background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--color-border)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  footer: { paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' as const },
};
