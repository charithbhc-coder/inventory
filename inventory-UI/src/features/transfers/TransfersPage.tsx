import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { transferRequestsService, PendingTransferRequest } from '@/services/transfer-requests.service';
import { formatDistanceToNow } from 'date-fns';

function EmployeeAvatar({ name, color }: { name: string; color?: string }) {
  const initials = name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';
  const bg = color || '#f0a500';
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: bg, color: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

function RejectModal({ request, onClose, onConfirm }: {
  request: PendingTransferRequest;
  onClose: () => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-dark)', padding: 24 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800 }}>Reject Transfer Request</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
          Rejecting transfer of <strong>{request.item.name}</strong> to <strong>{request.newAssignedToName || 'department'}</strong>.
        </p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          Reason for rejection <span style={{ color: '#e11d48' }}>*</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Explain why this transfer is being rejected..."
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => notes.trim() && onConfirm(notes)}
            disabled={!notes.trim()}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: notes.trim() ? '#f44336' : '#444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: notes.trim() ? 'pointer' : 'not-allowed' }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#4caf50',
  REJECTED: '#f44336',
  CANCELLED: '#888',
};

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [rejectTarget, setRejectTarget] = useState<PendingTransferRequest | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['transfer-requests', 'pending'],
    queryFn: transferRequestsService.getPending,
    enabled: tab === 'pending',
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['transfer-requests', 'history'],
    queryFn: () => transferRequestsService.getHistory(),
    enabled: tab === 'history',
  });

  const history = historyData?.items || [];

  const handleApprove = async (req: PendingTransferRequest) => {
    if (!window.confirm(`Approve transfer of "${req.item.name}" to ${req.newAssignedToName || 'department'}?`)) return;
    setActionId(req.id);
    try {
      await transferRequestsService.approve(req.id);
      toast.success(`Transfer approved — asset reassigned to ${req.newAssignedToName || 'department'}`);
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', 'employee-groups'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (notes: string) => {
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    try {
      await transferRequestsService.reject(rejectTarget.id, notes);
      toast.success('Transfer request rejected');
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', 'employee-groups'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionId(null);
      setRejectTarget(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 40 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          Transfer Requests
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
          Review and approve asset transfer requests from IT Support.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['pending', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: tab === t ? 'none' : '1px solid var(--border-dark)',
              background: tab === t ? 'var(--accent-yellow)' : 'transparent',
              color: tab === t ? '#000' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t === 'pending' ? 'Pending' : 'History'}
            {t === 'pending' && pending.length > 0 && (
              <span style={{ background: '#000', color: 'var(--accent-yellow)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <>
          {pendingLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : pending.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <ArrowLeftRight size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No pending transfer requests</div>
              <div style={{ fontSize: 13 }}>All requests have been reviewed.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    {['Asset', 'Current Holder', 'Transfer To', 'Reason', 'Requested By', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700 }}>{req.item.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{req.item.barcode}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <EmployeeAvatar name={req.item.assignedToName || '?'} color="#f0a500" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{req.item.assignedToName || '—'}</div>
                            {req.item.assignedToEmployeeId && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{req.item.assignedToEmployeeId}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <EmployeeAvatar name={req.newAssignedToName || 'Dept'} color="#4caf50" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{req.newAssignedToName || 'Department transfer'}</div>
                            {req.newAssignedToEmployeeId && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{req.newAssignedToEmployeeId}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px', maxWidth: 180 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                          {req.reason}
                        </div>
                      </td>
                      <td style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {req.requestedByUser?.name || '—'}
                      </td>
                      <td style={{ padding: '14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDistanceToNow(new Date(req.createdAt))} ago
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={actionId === req.id}
                            style={{ padding: '5px 12px', background: 'rgba(76, 175, 80, 0.12)', color: '#4caf50', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: actionId === req.id ? 'not-allowed' : 'pointer', opacity: actionId === req.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(req)}
                            disabled={actionId === req.id}
                            style={{ padding: '5px 12px', background: 'rgba(244, 67, 54, 0.12)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: actionId === req.id ? 'not-allowed' : 'pointer', opacity: actionId === req.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No history yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    {['Asset', 'Transferred To', 'Reason', 'Requested By', 'Status', 'Notes', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((req: PendingTransferRequest) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{req.item?.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{req.item?.barcode}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12 }}>{req.newAssignedToName || 'Department'}</td>
                      <td style={{ padding: '12px 14px', maxWidth: 160 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>{req.reason}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{req.requestedByUser?.name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[req.status] || '#888'}20`, color: STATUS_COLORS[req.status] || '#aaa', border: `1px solid ${STATUS_COLORS[req.status] || '#888'}40` }}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 160 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reviewNotes || ''}>{req.reviewNotes || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDistanceToNow(new Date(req.updatedAt))} ago
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}
