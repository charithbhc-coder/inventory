import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, MapPin, FileText, User, Package, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import gatePassService from '@/services/gatePass.service';
import { itemService } from '@/services/item.service';
import { printGatePassForm } from '@/utils/formPrinter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
  companyLogoUrl?: string;
  mainCompanyLogoUrl?: string;
}

export default function CreateGatePassModal({
  isOpen,
  onClose,
  companyName = 'Company',
  companyLogoUrl,
  mainCompanyLogoUrl,
}: Props) {
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  const { data: warehouseItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items', { status: 'WAREHOUSE' }],
    queryFn: () => itemService.getItems({ status: 'WAREHOUSE', limit: 200 }),
    enabled: isOpen,
    select: (data: any) => Array.isArray(data) ? data : (data?.data || []),
  });

  const filtered = useMemo(() =>
    warehouseItems.filter((i: any) =>
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.barcode.toLowerCase().includes(itemSearch.toLowerCase())
    ), [warehouseItems, itemSearch]);

  const mutation = useMutation({
    mutationFn: (payload: any) => gatePassService.create(payload),
    onSuccess: async (gatePass) => {
      const itemsToPrint = gatePass.items.map((i) => ({
        name: i.name,
        barcode: i.barcode,
      }));
      await printGatePassForm(
        { name: companyName, logoUrl: companyLogoUrl, mainCompanyLogoUrl },
        itemsToPrint,
        { referenceNo: gatePass.referenceNo, destination: gatePass.destination, reason: gatePass.reason, authorizedBy: gatePass.authorizedBy },
      );
      toast.success(`Gate Pass ${gatePass.referenceNo} submitted for approval`);
      queryClient.invalidateQueries({ queryKey: ['gate-passes'] });
      handleClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to create gate pass'),
  });

  const handleClose = () => {
    setDestination('');
    setReason('');
    setAuthorizedBy('');
    setSelectedItemIds([]);
    setItemSearch('');
    onClose();
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSubmit = destination.trim() && reason.trim() && selectedItemIds.length > 0;

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100 }}
        onClick={handleClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 560, background: 'var(--bg-card)', borderRadius: 20,
        border: '1px solid var(--border-dark)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        zIndex: 1101, display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>New Gate Pass Request</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Select WAREHOUSE items and destination</p>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Destination */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Destination *
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '11px 12px 11px 36px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. Branch Office, Colombo"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reason *
            </label>
            <div style={{ position: 'relative' }}>
              <FileText size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '11px 12px 11px 36px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. Sent for repair, Reallocation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {/* Authorized By */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Authorized By
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '11px 12px 11px 36px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. IT Manager"
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
              />
            </div>
          </div>

          {/* Item Picker */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Items * — {selectedItemIds.length} selected
            </label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '9px 10px 9px 30px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 8, fontSize: 12, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Search by name or barcode..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-dark)', borderRadius: 10, background: 'var(--bg-dark)' }}>
              {loadingItems ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  <Package size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No WAREHOUSE items found</div>
                </div>
              ) : (
                filtered.map((item: any) => {
                  const selected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        cursor: 'pointer', borderBottom: '1px solid var(--border-dark)',
                        background: selected ? 'rgba(99,102,241,0.08)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {selected
                        ? <CheckSquare size={16} color="#6366f1" />
                        : <Square size={16} color="var(--text-muted)" />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.barcode}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-dark)', display: 'flex', gap: 12 }}>
          <button onClick={handleClose} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate({ itemIds: selectedItemIds, destination, reason, authorizedBy: authorizedBy || undefined })}
            style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: canSubmit ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: canSubmit ? '#fff' : 'var(--text-muted)', fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: mutation.isPending ? 0.7 : 1 }}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </>
  );
}
