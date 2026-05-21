import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, ClipboardList, CheckCircle2, Clock, XCircle, AlertTriangle,
  User, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { disposalRequestService } from '@/services/disposal-request.service';
import {
  DisposalRequest, DisposalRequestStatus, DisposalReviewDecision,
  DisposalFinalDecision, AdminPermission, DataSecurityChecklist,
} from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { getUploadUrl } from '@/lib/config';

interface Props {
  requestId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CONDITION_LABELS: Record<string, string> = {
  BEYOND_REPAIR: 'Beyond Repair',
  OBSOLETE: 'Obsolete / End of Life',
  UNUSED: 'Unused / Surplus',
  PHYSICALLY_DAMAGED: 'Physically Damaged',
};

const METHOD_LABELS: Record<string, string> = {
  SCRAPPED: 'Scrapped',
  DONATED: 'Donated',
  RECYCLED: 'Recycled',
  SOLD: 'Sold',
  RETURNED_TO_VENDOR: 'Returned to Vendor',
};

const STATUS_COLOR: Record<DisposalRequestStatus, string> = {
  PENDING_L1: '#f59e0b',
  PENDING_L2: '#818cf8',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  CANCELLED: '#64748b',
};

const STATUS_LABEL: Record<DisposalRequestStatus, string> = {
  PENDING_L1: 'Awaiting L1 Review',
  PENDING_L2: 'Awaiting Final Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

// ── L1 Review Panel ─────────────────────────────────────────────
function L1ReviewPanel({ request, onDone }: { request: DisposalRequest; onDone: () => void }) {
  const [decision, setDecision] = useState<DisposalReviewDecision | ''>('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => disposalRequestService.l1Review(request.id, {
      decision: decision as DisposalReviewDecision,
      notes: notes || undefined,
    }),
    onSuccess: () => { toast.success('Review submitted'); onDone(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit review'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) { toast.error('Select a decision'); return; }
    if (decision === DisposalReviewDecision.REJECTED && !notes.trim()) {
      toast.error('Notes are required when rejecting'); return;
    }
    mutation.mutate();
  };

  return (
    <div style={panelStyle}>
      <div style={panelHeader}>
        <ShieldCheck size={16} style={{ color: '#818cf8' }} />
        <span>Your L1 Review</span>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {([DisposalReviewDecision.RECOMMENDED, DisposalReviewDecision.REJECTED] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                border: decision === d ? `2px solid ${d === DisposalReviewDecision.RECOMMENDED ? '#10b981' : '#ef4444'}` : '2px solid var(--color-border)',
                background: decision === d ? (d === DisposalReviewDecision.RECOMMENDED ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
                color: decision === d ? (d === DisposalReviewDecision.RECOMMENDED ? '#10b981' : '#ef4444') : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {d === DisposalReviewDecision.RECOMMENDED ? '✓ Recommend' : '✗ Reject'}
            </button>
          ))}
        </div>
        <div>
          <label style={labelStyle}>
            NOTES{decision === DisposalReviewDecision.REJECTED ? <span style={{ color: '#ef4444' }}> *</span> : ' (optional)'}
          </label>
          <textarea
            style={textareaStyle}
            placeholder={decision === DisposalReviewDecision.REJECTED ? 'Required: explain why you are rejecting...' : 'Optional review notes...'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ fontSize: 13 }}>
          {mutation.isPending ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

// ── L2 Approval Panel ────────────────────────────────────────────
const CHECKLIST_LABELS: Record<keyof DataSecurityChecklist, string> = {
  businessDataBacked: 'Business data has been backed up',
  companyDataErased: 'All company data has been erased',
  storageFormatted: 'Storage/drives have been formatted',
  userAccountsRemoved: 'User accounts have been removed',
  removedFromDomain: 'Device has been removed from domain',
  physicalDestructionDone: 'Physical destruction (if applicable) is done',
};

function L2ApprovalPanel({ request, onDone }: { request: DisposalRequest; onDone: () => void }) {
  const [decision, setDecision] = useState<DisposalFinalDecision | ''>('');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<DataSecurityChecklist>({
    businessDataBacked: false,
    companyDataErased: false,
    storageFormatted: false,
    userAccountsRemoved: false,
    removedFromDomain: false,
    physicalDestructionDone: false,
  });

  const allChecked = Object.values(checklist).every(Boolean);

  const mutation = useMutation({
    mutationFn: () => disposalRequestService.l2Approve(request.id, {
      decision: decision as DisposalFinalDecision,
      notes: notes || undefined,
      dataSecurityChecklist: decision === DisposalFinalDecision.APPROVED ? checklist : undefined,
    }),
    onSuccess: () => { toast.success(decision === DisposalFinalDecision.APPROVED ? 'Disposal approved — asset marked as disposed' : 'Request rejected'); onDone(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit decision'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) { toast.error('Select a decision'); return; }
    if (decision === DisposalFinalDecision.REJECTED && !notes.trim()) {
      toast.error('Notes are required when rejecting'); return;
    }
    if (decision === DisposalFinalDecision.APPROVED && !allChecked) {
      toast.error('All data security checklist items must be confirmed before approving'); return;
    }
    mutation.mutate();
  };

  return (
    <div style={panelStyle}>
      <div style={panelHeader}>
        <ShieldCheck size={16} style={{ color: '#10b981' }} />
        <span>Your Final Approval</span>
        {request.l1Bypassed && (
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>
            L1 BYPASSED
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {([DisposalFinalDecision.APPROVED, DisposalFinalDecision.REJECTED] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                border: decision === d ? `2px solid ${d === DisposalFinalDecision.APPROVED ? '#10b981' : '#ef4444'}` : '2px solid var(--color-border)',
                background: decision === d ? (d === DisposalFinalDecision.APPROVED ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
                color: decision === d ? (d === DisposalFinalDecision.APPROVED ? '#10b981' : '#ef4444') : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {d === DisposalFinalDecision.APPROVED ? '✓ Approve' : '✗ Reject'}
            </button>
          ))}
        </div>

        {decision === DisposalFinalDecision.APPROVED && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>DATA SECURITY CHECKLIST <span style={{ color: '#ef4444' }}>*</span></label>
            {(Object.keys(CHECKLIST_LABELS) as (keyof DataSecurityChecklist)[]).map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: checklist[key] ? 'rgba(16,185,129,0.06)' : 'var(--color-surface-2)', border: `1px solid ${checklist[key] ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`, transition: 'all 0.15s' }}>
                <input
                  type="checkbox"
                  checked={checklist[key]}
                  onChange={e => setChecklist(c => ({ ...c, [key]: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#10b981', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: checklist[key] ? '#10b981' : 'var(--color-text-secondary)' }}>
                  {CHECKLIST_LABELS[key]}
                </span>
              </label>
            ))}
            {!allChecked && (
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={12} /> All items must be checked before approving
              </div>
            )}
          </div>
        )}

        <div>
          <label style={labelStyle}>
            NOTES{decision === DisposalFinalDecision.REJECTED ? <span style={{ color: '#ef4444' }}> *</span> : ' (optional)'}
          </label>
          <textarea
            style={textareaStyle}
            placeholder={decision === DisposalFinalDecision.REJECTED ? 'Required: reason for rejection...' : 'Optional notes...'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ fontSize: 13 }}>
          {mutation.isPending ? 'Submitting...' : 'Submit Decision'}
        </button>
      </form>
    </div>
  );
}

// ── Main Drawer ──────────────────────────────────────────────────
export default function DisposalRequestDetailDrawer({ requestId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuthStore();

  const { data: request, isLoading } = useQuery({
    queryKey: ['disposal-request', requestId],
    queryFn: () => disposalRequestService.getOne(requestId),
    enabled: isOpen && !!requestId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => disposalRequestService.cancel(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['disposal-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['disposal-check'] });
      toast.success('Disposal request cancelled');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const handleActionDone = () => {
    queryClient.invalidateQueries({ queryKey: ['disposal-requests'] });
    queryClient.invalidateQueries({ queryKey: ['disposal-request', requestId] });
    queryClient.invalidateQueries({ queryKey: ['disposal-check'] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  if (!isOpen) return null;

  const canL1Review =
    hasPermission(AdminPermission.APPROVE_DISPOSAL_L1) &&
    request?.status === DisposalRequestStatus.PENDING_L1 &&
    request.requestedByUserId !== user?.id;

  const canL2Approve =
    hasPermission(AdminPermission.APPROVE_DISPOSAL_L2) &&
    (request?.status === DisposalRequestStatus.PENDING_L1 || request?.status === DisposalRequestStatus.PENDING_L2) &&
    request?.requestedByUserId !== user?.id;

  const canCancel =
    hasPermission(AdminPermission.REQUEST_DISPOSAL) &&
    request?.requestedByUserId === user?.id &&
    (request?.status === DisposalRequestStatus.PENDING_L1 || request?.status === DisposalRequestStatus.PENDING_L2);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 500, background: 'var(--bg-surface)', zIndex: 1001, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-dark)', boxShadow: '-20px 0 50px rgba(0,0,0,0.3)', animation: 'slideLeft 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', background: 'var(--bg-sidebar)', color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Disposal Request</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {request?.item?.barcode || '—'} — {request?.item?.name || '—'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
          {request && (
            <div style={{ marginTop: 16 }}>
              <span style={{ padding: '4px 12px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: `${STATUS_COLOR[request.status]}22`, color: STATUS_COLOR[request.status], border: `1px solid ${STATUS_COLOR[request.status]}44`, textTransform: 'uppercase' }}>
                {STATUS_LABEL[request.status]}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }} className="custom-scrollbar">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</div>
          ) : !request ? null : (
            <>
              {/* ── Step 1: Request ── */}
              <TimelineSection
                step={1}
                title="Request Submitted"
                actor={`${request.requestedByUser.firstName} ${request.requestedByUser.lastName}`}
                date={request.requestedAt}
                statusColor="#818cf8"
                done
              >
                <DetailRow label="Condition" value={CONDITION_LABELS[request.disposalCondition] || request.disposalCondition} />
                <DetailRow label="Disposal Reason" value={request.disposalReason} />
                <DetailRow label="Proposed Method" value={METHOD_LABELS[request.proposedMethod] || request.proposedMethod} />
                <div style={{ marginTop: 10 }}>
                  <div style={labelStyle}>TECHNICAL EVALUATION</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border-dark)' }}>
                    {request.technicalEvaluation}
                  </div>
                </div>
                {request.notes && <DetailRow label="Notes" value={request.notes} />}
                {request.evidencePhotoUrls && request.evidencePhotoUrls.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={labelStyle}>EVIDENCE PHOTOS</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {request.evidencePhotoUrls.map((url, i) => (
                        <a key={i} href={getUploadUrl(url)} target="_blank" rel="noopener noreferrer">
                          <img src={getUploadUrl(url)} alt={`Evidence ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-dark)' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </TimelineSection>

              {/* ── Step 2: L1 Review ── */}
              <TimelineSection
                step={2}
                title="L1 Review (IT Manager)"
                actor={request.l1ReviewedByUser ? `${request.l1ReviewedByUser.firstName} ${request.l1ReviewedByUser.lastName}` : undefined}
                date={request.l1ReviewedAt || undefined}
                statusColor={request.l1Decision === DisposalReviewDecision.RECOMMENDED ? '#10b981' : request.l1Decision === DisposalReviewDecision.REJECTED ? '#ef4444' : '#64748b'}
                done={!!request.l1ReviewedAt}
                bypassed={request.l1Bypassed}
              >
                {request.l1Bypassed && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
                    L1 review was bypassed — Director Finance acted directly.
                  </div>
                )}
                {request.l1Decision && !request.l1Bypassed && (
                  <>
                    <DetailRow
                      label="Decision"
                      value={request.l1Decision === DisposalReviewDecision.RECOMMENDED ? '✓ Recommended' : '✗ Rejected'}
                      valueColor={request.l1Decision === DisposalReviewDecision.RECOMMENDED ? '#10b981' : '#ef4444'}
                    />
                    {request.l1Notes && <DetailRow label="Notes" value={request.l1Notes} />}
                  </>
                )}
              </TimelineSection>

              {/* ── L1 Action Panel ── */}
              {canL1Review && <L1ReviewPanel request={request} onDone={handleActionDone} />}

              {/* ── Step 3: Final Approval ── */}
              <TimelineSection
                step={3}
                title="Final Approval (Director Finance)"
                actor={request.l2ApprovedByUser ? `${request.l2ApprovedByUser.firstName} ${request.l2ApprovedByUser.lastName}` : undefined}
                date={request.l2ApprovedAt || undefined}
                statusColor={request.l2Decision === DisposalFinalDecision.APPROVED ? '#10b981' : request.l2Decision === DisposalFinalDecision.REJECTED ? '#ef4444' : '#64748b'}
                done={!!request.l2ApprovedAt}
              >
                {request.l2Decision && (
                  <>
                    <DetailRow
                      label="Decision"
                      value={request.l2Decision === DisposalFinalDecision.APPROVED ? '✓ Approved — Asset Disposed' : '✗ Rejected'}
                      valueColor={request.l2Decision === DisposalFinalDecision.APPROVED ? '#10b981' : '#ef4444'}
                    />
                    {request.l2Notes && <DetailRow label="Notes" value={request.l2Notes} />}
                    {request.dataSecurityChecklist && (
                      <div style={{ marginTop: 10 }}>
                        <div style={labelStyle}>DATA SECURITY CHECKLIST</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(Object.entries(CHECKLIST_LABELS) as [keyof DataSecurityChecklist, string][]).map(([key, label]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: request.dataSecurityChecklist![key] ? '#10b981' : '#ef4444' }}>
                              {request.dataSecurityChecklist![key] ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TimelineSection>

              {/* ── L2 Action Panel ── */}
              {canL2Approve && <L2ApprovalPanel request={request} onDone={handleActionDone} />}

              {/* ── Cancel ── */}
              {canCancel && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-dark)' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { if (confirm('Cancel this disposal request?')) cancelMutation.mutate(); }}
                    disabled={cancelMutation.isPending}
                    style={{ fontSize: 13, width: '100%' }}
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel This Request'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <style>{`
          @keyframes slideLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </div>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function TimelineSection({ step, title, actor, date, statusColor, done, bypassed, children }: {
  step: number; title: string; actor?: string; date?: string;
  statusColor: string; done: boolean; bypassed?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? `${statusColor}22` : 'var(--bg-dark)', border: `2px solid ${done ? statusColor : 'var(--border-dark)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: done ? statusColor : 'var(--color-text-muted)', fontSize: 11, fontWeight: 900 }}>
          {done ? <CheckCircle2 size={14} /> : step}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--color-text-primary)' }}>{title}</div>
          {done && actor && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <User size={10} />
              {actor}
              {date && <> · <Clock size={10} /> {format(new Date(date), 'MMM dd, HH:mm')}</>}
            </div>
          )}
          {!done && !bypassed && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>Pending</div>
          )}
        </div>
      </div>
      {children && (
        <div style={{ marginLeft: 38, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={labelStyle}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: valueColor || 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  marginBottom: 24, padding: 16,
  background: 'var(--bg-dark)', borderRadius: 12,
  border: '1px solid var(--border-dark)',
};

const panelHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
  fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--color-text-primary)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)',
  letterSpacing: '0.05em', marginBottom: 6, display: 'block',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: 10, background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12,
  color: 'var(--color-text-primary)', outline: 'none', minHeight: 72,
  resize: 'none', fontFamily: 'inherit',
};
