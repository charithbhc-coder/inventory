import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ClipboardCheck, MapPin, User, Calendar, Package, AlertTriangle, Printer, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import gatePassService, { GatePass } from '@/services/gatePass.service';
import { companyService } from '@/services/company.service';
import { GatePassStatus, AdminPermission } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { printGatePassForm } from '@/utils/formPrinter';

interface Props {
  passId: string;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_STYLES: Record<GatePassStatus, { bg: string; color: string; label: string }> = {
  PENDING_APPROVAL: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pending Approval' },
  ACTIVE:           { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', label: 'Active' },
  RETURNED:         { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Returned' },
  CANCELLED:        { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

export default function GatePassDetailDrawer({ passId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuthStore();
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data: gatePass, isLoading } = useQuery({
    queryKey: ['gate-pass', passId],
    queryFn: () => gatePassService.getOne(passId),
    enabled: isOpen && !!passId,
  });

  const { data: brandingData } = useQuery({
    queryKey: ['companies-branding'],
    queryFn: () => companyService.getBranding(),
    staleTime: 5 * 60 * 1000,
  });

  const mainCompanyLogoUrl = useMemo(() => {
    const ktmg = (brandingData || []).find((c: any) =>
      c.code?.toUpperCase() === 'KTMG' ||
      c.name?.toLowerCase().includes('kids and teens')
    );
    return ktmg?.logoUrl;
  }, [brandingData]);

  const companyLogoUrl = useMemo(() => {
    if (!gatePass?.companyId || !brandingData) return undefined;
    return brandingData.find((c: any) => c.id === gatePass.companyId)?.logoUrl;
  }, [brandingData, gatePass?.companyId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['gate-passes'] });
    queryClient.invalidateQueries({ queryKey: ['gate-pass', passId] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
  };

  const approveMutation = useMutation<GatePass, Error, string>({
    mutationFn: (id) => gatePassService.approve(id),
    onSuccess: () => { toast.success('Gate pass approved — items are now IN_TRANSIT'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation<GatePass, Error, { id: string; notes: string }>({
    mutationFn: ({ id, notes }) => gatePassService.reject(id, notes),
    onSuccess: () => { toast.success('Gate pass sent back for revision'); setShowRejectInput(false); setRejectNotes(''); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to reject'),
  });

  const cancelMutation = useMutation<GatePass, Error, string>({
    mutationFn: (id) => gatePassService.cancel(id),
    onSuccess: () => { toast.success('Gate pass cancelled'); invalidate(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to cancel'),
  });

  const returnMutation = useMutation<GatePass, Error, string>({
    mutationFn: (id) => gatePassService.markReturned(id),
    onSuccess: () => { toast.success('Gate pass returned — items back in WAREHOUSE'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to mark returned'),
  });

  const handlePrint = async () => {
    if (!gatePass) return;
    try {
      const itemsToPrint = gatePass.items.map((i) => ({ name: i.name, barcode: i.barcode }));
      const companyName = brandingData?.find((c: any) => c.id === gatePass.companyId)?.name || 'Company';
      await printGatePassForm(
        {
          name: companyName,
          logoUrl: companyLogoUrl,
          mainCompanyLogoUrl: mainCompanyLogoUrl || companyLogoUrl,
        },
        itemsToPrint,
        { referenceNo: gatePass.referenceNo, destination: gatePass.destination, reason: gatePass.reason, authorizedBy: gatePass.authorizedBy },
      );
    } catch {
      toast.error('Failed to generate print preview');
    }
  };

  if (!isOpen) return null;

  const canApprove = hasPermission(AdminPermission.APPROVE_GATE_PASS);
  const canCreate = hasPermission(AdminPermission.CREATE_GATE_PASS);

  const isApproveAction =
    canApprove &&
    gatePass?.status === GatePassStatus.PENDING_APPROVAL &&
    gatePass?.createdByUserId !== user?.id;

  const isCancelAction =
    canCreate &&
    gatePass?.status === GatePassStatus.PENDING_APPROVAL &&
    gatePass?.createdByUserId === user?.id;

  const isReturnAction =
    canApprove && gatePass?.status === GatePassStatus.ACTIVE;

  const canPrint =
    gatePass?.status === GatePassStatus.ACTIVE ||
    gatePass?.status === GatePassStatus.RETURNED;

  const s = gatePass ? STATUS_STYLES[gatePass.status] : null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 1100 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: 520,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border-dark)',
        zIndex: 1101, display: 'flex', flexDirection: 'column', overflowY: 'auto',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardCheck size={22} color="#818cf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                {isLoading ? '...' : gatePass?.referenceNo}
              </h2>
              {s && (
                <span style={{ padding: '2px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, border: `1px solid ${s.color}33`, textTransform: 'uppercase' as const }}>
                  {s.label}
                </span>
              )}
              {!isLoading && gatePass && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                  {format(new Date(gatePass.createdAt), 'MMM dd, yyyy')}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : !gatePass ? null : (
          <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Rejection banner */}
            {gatePass.status === GatePassStatus.PENDING_APPROVAL && gatePass.rejectionNotes && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', marginBottom: 4 }}>Returned for revision</div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)' }}>{gatePass.rejectionNotes}</div>
                </div>
              </div>
            )}

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <DetailRow icon={<MapPin size={15} />} label="Destination" value={gatePass.destination} />
              {gatePass.reason && <DetailRow icon={<ClipboardCheck size={15} />} label="Reason" value={gatePass.reason} />}
              {gatePass.authorizedBy && <DetailRow icon={<User size={15} />} label="Authorized By" value={gatePass.authorizedBy} />}
              <DetailRow
                icon={<User size={15} />}
                label="Requested By"
                value={`${gatePass.createdByUser.firstName} ${gatePass.createdByUser.lastName}`}
              />
              {gatePass.approvedByUser && (
                <DetailRow
                  icon={<CheckCircle2 size={15} />}
                  label="Approved By"
                  value={`${gatePass.approvedByUser.firstName} ${gatePass.approvedByUser.lastName}`}
                />
              )}
              <DetailRow
                icon={<Calendar size={15} />}
                label="Submitted"
                value={format(new Date(gatePass.createdAt), 'MMM dd, yyyy HH:mm')}
              />
              {gatePass.approvedAt && (
                <DetailRow
                  icon={<Calendar size={15} />}
                  label="Approved"
                  value={format(new Date(gatePass.approvedAt), 'MMM dd, yyyy HH:mm')}
                />
              )}
            </div>

            {/* Items list */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10 }}>
                <Package size={13} style={{ display: 'inline', marginRight: 6 }} />
                Items ({gatePass.items.length})
              </div>
              <div style={{ border: '1px solid var(--border-dark)', borderRadius: 10, overflow: 'hidden' }}>
                {gatePass.items.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: i < gatePass.items.length - 1 ? '1px solid var(--border-dark)' : 'none',
                      background: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.barcode}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>
                      {item.status === 'WAREHOUSE' ? 'In Stock' : item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reject input */}
            {showRejectInput && (
              <div style={{ padding: 16, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#ef4444', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  Rejection Notes *
                </label>
                <textarea
                  style={{ width: '100%', padding: 12, background: 'var(--bg-dark)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--text-main)', outline: 'none', resize: 'none' as const, minHeight: 80, boxSizing: 'border-box' as const }}
                  placeholder="Explain why this request is being returned for revision..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectNotes(''); }}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!rejectNotes.trim() || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate({ id: passId, notes: rejectNotes })}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !rejectNotes.trim() ? 0.5 : 1 }}
                  >
                    {rejectMutation.isPending ? 'Sending...' : 'Send Back'}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
              {isApproveAction && !showRejectInput && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(passId)}
                    disabled={approveMutation.isPending}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: approveMutation.isPending ? 0.7 : 1 }}
                  >
                    <CheckCircle2 size={16} />
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              )}

              {isCancelAction && (
                <button
                  onClick={() => cancelMutation.mutate(passId)}
                  disabled={cancelMutation.isPending}
                  style={{ padding: '12px 0', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}

              {isReturnAction && (
                <button
                  onClick={() => {
                    if (!window.confirm(`Mark ${gatePass.referenceNo} as RETURNED? All ${gatePass.items.length} item(s) will go back to WAREHOUSE.`)) return;
                    returnMutation.mutate(passId);
                  }}
                  disabled={returnMutation.isPending}
                  style={{ padding: '12px 0', borderRadius: 10, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)', color: '#f59e0b', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  {returnMutation.isPending ? 'Processing...' : 'Mark as Returned'}
                </button>
              )}

              {canPrint && (
                <button
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Printer size={16} />
                  Print Gate Pass
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{value}</div>
      </div>
    </div>
  );
}
