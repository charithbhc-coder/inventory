import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, User, Package, FileText, FileDown, Loader } from 'lucide-react';
import { itemService, Item } from '@/services/item.service';
import { printAssetIssuanceForm, printAssetHandoverForm, PrintableItem, EmployeeInfo } from '@/utils/formPrinter';

interface EmployeeAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmployeeGroup {
  name: string;
  employeeId?: string;
  department?: string;
  companyLogoUrl?: string;
  items: Item[];
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; color: string }> = {
    'IN_USE':         { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
    'WAREHOUSE':      { bg: 'rgba(71, 85, 105, 0.12)', color: '#475569' },
    'IN_REPAIR':      { bg: 'rgba(217, 119, 6, 0.12)',  color: '#d97706' },
    'SENT_TO_REPAIR': { bg: 'rgba(217, 119, 6, 0.12)',  color: '#d97706' },
    'LOST':           { bg: 'rgba(225, 29, 72, 0.12)',  color: '#e11d48' },
    'DISPOSED':       { bg: 'rgba(15, 23, 42, 0.12)',   color: '#0f172a' },
  };
  const s = map[status] || map['WAREHOUSE'];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.color}22`,
      textTransform: 'uppercase', whiteSpace: 'nowrap'
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default function EmployeeAssetsModal({ isOpen, onClose }: EmployeeAssetsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeGroup | null>(null);
  const [printing, setPrinting] = useState(false);

  // Always load all currently assigned (IN_USE) items on open
  const { data: itemData, isLoading } = useQuery({
    queryKey: ['employee-assets-all'],
    queryFn: () => itemService.getItems({ status: 'IN_USE', limit: 500 }),
    enabled: isOpen,
  });

  const allItems: Item[] = useMemo(() => {
    const raw = Array.isArray(itemData) ? itemData : (itemData as any)?.data || [];
    return raw.filter((i: Item) => i.assignedToName);
  }, [itemData]);

  // Group all items by employee name
  const allGroups: EmployeeGroup[] = useMemo(() => {
    const map = new Map<string, EmployeeGroup>();
    allItems.forEach((item) => {
      if (!item.assignedToName) return;
      const key = item.assignedToName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: item.assignedToName,
          employeeId: item.assignedToEmployeeId || undefined,
          department: item.department?.name,
          companyLogoUrl: item.company?.logoUrl || undefined,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems]);

  // Filter by search — match name OR employee ID, case-insensitive
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.employeeId && g.employeeId.toLowerCase().includes(q))
    );
  }, [allGroups, searchQuery]);

  const toPrintableItems = (items: Item[]): PrintableItem[] =>
    items.map(item => ({
      name: item.name,
      barcode: item.barcode,
      serialNumber: item.serialNumber,
      condition: item.condition,
      category: item.category?.name,
      location: item.location || undefined,
    }));

  const toEmployeeInfo = (group: EmployeeGroup): EmployeeInfo => ({
    name: group.name,
    employeeId: group.employeeId,
    department: group.department || group.items[0]?.department?.name,
    company: group.items[0]?.company?.name,
    companyLogoUrl: group.companyLogoUrl || group.items[0]?.company?.logoUrl,
  });

  const handlePrint = async (fn: () => Promise<void>) => {
    setPrinting(true);
    try {
      await fn();
    } finally {
      setTimeout(() => setPrinting(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 900, maxHeight: '88vh', background: 'var(--bg-surface)', borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', border: '1px solid var(--border-dark)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <User size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>Employee Asset View</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                All currently assigned employees &bull; Search to filter &bull; Click to view &amp; print forms
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border-dark)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              autoFocus
              type="text"
              placeholder="Filter by employee name or ID..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSelectedEmployee(null); }}
              style={{
                width: '100%', padding: '11px 16px 11px 44px', borderRadius: 10,
                border: '1px solid var(--border-dark)', background: 'var(--search-bg)',
                color: 'var(--text-main)', fontSize: 13, outline: 'none',
              }}
            />
            {isLoading && (
              <Loader size={16} color="var(--accent-yellow)" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />
            )}
          </div>
          {!isLoading && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>
              {searchQuery
                ? `${filteredGroups.length} of ${allGroups.length} employees match "${searchQuery}"`
                : `${allGroups.length} employee${allGroups.length !== 1 ? 's' : ''} currently holding assets`}
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 32, height: 32, border: '3px solid rgba(255,224,83,0.1)', borderTop: '3px solid var(--accent-yellow)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading assigned assets...</p>
            </div>
          ) : selectedEmployee ? (
            /* Detail view for a selected employee */
            <div>
              <button
                onClick={() => setSelectedEmployee(null)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-yellow)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: 0 }}
              >
                ← Back to list
              </button>

              {/* Employee Info Card */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                        {selectedEmployee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{selectedEmployee.name}</div>
                        {selectedEmployee.employeeId && (
                          <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent-yellow)', fontWeight: 700, marginTop: 2 }}>
                            ID: {selectedEmployee.employeeId}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {selectedEmployee.department && <span>📍 {selectedEmployee.department}</span>}
                      {selectedEmployee.items[0]?.company?.name && <span>🏢 {selectedEmployee.items[0].company.name}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 24px' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{selectedEmployee.items.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>Total Assets</div>
                  </div>
                </div>

                {/* Print Buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-dark)', flexWrap: 'wrap' }}>
                  <button
                    disabled={printing}
                    onClick={() => handlePrint(() =>
                      printAssetIssuanceForm(toEmployeeInfo(selectedEmployee), toPrintableItems(selectedEmployee.items))
                    )}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 13, fontWeight: 700, cursor: printing ? 'not-allowed' : 'pointer', opacity: printing ? 0.6 : 1 }}
                  >
                    <FileText size={16} />
                    {printing ? 'Preparing...' : 'Print Issuance Form'}
                  </button>
                  <button
                    disabled={printing}
                    onClick={() => handlePrint(() =>
                      printAssetHandoverForm(toEmployeeInfo(selectedEmployee), toPrintableItems(selectedEmployee.items))
                    )}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: printing ? 'not-allowed' : 'pointer', opacity: printing ? 0.6 : 1 }}
                  >
                    <FileDown size={16} />
                    {printing ? 'Preparing...' : 'Print Handover Form'}
                  </button>
                </div>
              </div>

              {/* Assets Table */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border-dark)' }}>
                      {['Asset Name', 'Barcode', 'Category', 'Status', 'Location'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEmployee.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                          {item.serialNumber && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>SN: {item.serialNumber}</div>}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 700 }}>{item.barcode}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{item.category?.name || '—'}</td>
                        <td style={{ padding: '14px 16px' }}><StatusBadge status={item.status} /></td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{item.location || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ opacity: 0.15, margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>No Match Found</p>
              <p style={{ fontSize: 13, marginTop: 6, opacity: 0.6 }}>
                {searchQuery ? `No employees match "${searchQuery}"` : 'No assets are currently assigned to anyone.'}
              </p>
            </div>
          ) : (
            /* Employee list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredGroups.map((group) => (
                <div
                  key={group.name}
                  onClick={() => setSelectedEmployee(group)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{group.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {group.employeeId && (
                          <span style={{ fontFamily: 'monospace', color: 'var(--accent-yellow)', fontWeight: 700 }}>#{group.employeeId}</span>
                        )}
                        {group.department && <span>📍 {group.department}</span>}
                        {group.items[0]?.company?.name && <span>🏢 {group.items[0].company.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'center', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '6px 14px' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{group.items.length}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Assets</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .hover-card:hover { border-color: var(--accent-yellow) !important; transform: translateX(2px); }
      `}</style>
    </div>
  );
}
