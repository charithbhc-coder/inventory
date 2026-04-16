import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { licenseService, License, LicenseStatus, PaginatedLicenses } from '@/services/license.service';
import { Plus, Edit, Search, Key, ShieldX, Clock, Power, PowerOff } from 'lucide-react';
import LicenseModal from './LicenseModal';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper<License>();

export default function LicensesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [statusFilter, setStatusFilter] = useState<LicenseStatus | 'ALL'>('ALL');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['licenses', statusFilter, search, page],
    queryFn: () => licenseService.getLicenses({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search,
      page,
      limit: 15,
    }),
  });

  const licenses: License[] = useMemo(() => Array.isArray(data) ? data : (data as PaginatedLicenses)?.data || [], [data]);
  const licenseMeta = useMemo(() => (data as PaginatedLicenses)?.meta || { total: licenses.length, lastPage: 1 }, [data]);

  const createMutation = useMutation({
    mutationFn: licenseService.createLicense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      setIsModalOpen(false);
      toast.success('License added successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add license');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<License> }) => licenseService.updateLicense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      setIsModalOpen(false);
      toast.success('License updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update license');
    }
  });



  const handleSave = (formData: Partial<License>) => {
    if (selectedLicense) {
      updateMutation.mutate({ id: selectedLicense.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('softwareName', {
      header: 'SOFTWARE',
      cell: info => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 12px rgba(16, 185, 129, 0.2)',
          }}>
            <Key size={18} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 14 }}>{info.getValue()}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.row.original.vendor}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('expiryDate', {
      header: 'EXPIRY DATE',
      cell: info => {
        const dateStr = info.getValue() ? new Date(info.getValue()).toLocaleDateString() : 'N/A';
        const isExpired = info.row.original.status === LicenseStatus.EXPIRED;
        const isExpiringSoon = info.row.original.status === LicenseStatus.EXPIRING_SOON;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : 'var(--text-main)' }}>
            {isExpired ? <ShieldX size={14} /> : isExpiringSoon ? <Clock size={14} /> : null}
            <span style={{ fontWeight: 600, fontSize: 13 }}>{dateStr}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('category', {
      header: 'CATEGORY',
      cell: info => info.getValue() ? <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-main)' }}>{info.getValue()}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Uncategorized</span>,
    }),
    columnHelper.accessor('status', {
      header: 'STATUS',
      cell: info => {
        const val = info.getValue();
        let color = '#10b981';
        let bg = 'rgba(16, 185, 129, 0.12)';

        if (val === LicenseStatus.EXPIRED || val === LicenseStatus.CANCELLED) { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.12)'; }
        else if (val === LicenseStatus.EXPIRING_SOON) { color = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.12)'; }

        return (
          <span style={{
            padding: '4px 12px', borderRadius: 50, fontSize: 10, fontWeight: 800,
            background: bg, color, border: `1px solid ${color}30`,
            letterSpacing: '0.02em', textTransform: 'uppercase'
          }}>
            {val.replace('_', ' ')}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'ACTIONS',
      cell: info => {
        const isCancelled = info.row.original.status === LicenseStatus.CANCELLED;
        return (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', height: '100%' }}>

            <button
              title={isCancelled ? "Reactivate License" : "Cancel/Deactivate License"}
              onClick={() => {
                updateMutation.mutate({
                  id: info.row.original.id,
                  payload: { status: isCancelled ? LicenseStatus.ACTIVE : LicenseStatus.CANCELLED }
                });
              }}
              style={{
                background: isCancelled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${isCancelled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                borderRadius: 8, padding: '7px', cursor: 'pointer',
                color: isCancelled ? '#10b981' : '#ef4444',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isCancelled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isCancelled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'; }}
            >
              {isCancelled ? <Power size={16} /> : <PowerOff size={16} />}
            </button>

            <button
              title="Edit License"
              onClick={() => { setSelectedLicense(info.row.original); setIsModalOpen(true); }}
              style={{
                background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#3b82f6',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; }}
            >
              <Edit size={16} />
            </button>



          </div>
        );
      },
    }),
  ], [isMobile, updateMutation]);

  const visibleColumns = useMemo(() => {
    return columns.filter((col: any) => col.isVisible !== false);
  }, [columns]);

  const table = useReactTable({
    data: licenses,
    columns: visibleColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ padding: isMobile ? '0 0 20px' : '0 0 40px' }}>
      <header style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        marginBottom: 32,
        gap: 16
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Software Licenses</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: isMobile ? 12 : 14 }}>Track digital assets, manage renewals, and monitor expirations.</p>
        </div>
        <button
          className="primary-btn"
          onClick={() => { setSelectedLicense(null); setIsModalOpen(true); }}
          style={{ height: 'fit-content' }}
        >
          <Plus size={18} /> Add License
        </button>
      </header>

      <div className="dark-card">
        {/* Toolbar */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-dark)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 16
        }}>
          <div style={{ position: 'relative', width: isMobile ? '100%' : 300 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by software or vendor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13 }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as LicenseStatus | 'ALL'); setPage(1); }}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-dark)',
              background: 'var(--search-bg)',
              color: 'var(--text-main)',
              fontSize: 13,
              width: isMobile ? '100%' : 'auto'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value={LicenseStatus.ACTIVE}>Active</option>
            <option value={LicenseStatus.EXPIRING_SOON}>Expiring Soon</option>
            <option value={LicenseStatus.EXPIRED}>Expired</option>
            <option value={LicenseStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 600 : 800 }}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border-dark)', background: 'rgba(0,0,0,0.1)' }}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{
                        padding: isMobile ? '12px 16px' : '16px 24px',
                        textAlign: header.id === 'actions' ? 'center' : 'left',
                        fontSize: isMobile ? 10 : 11,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.5px',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading licenses...</td></tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Key size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>No licenses match your criteria.</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-dark)' }} className="table-row-hover">
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{
                          padding: isMobile ? '12px 16px' : '16px 24px',
                          fontSize: isMobile ? 12 : 13,
                          color: 'var(--text-main)',
                          textAlign: (cell.column.id === 'actions') ? 'center' : 'left',
                          maxWidth: isMobile ? 150 : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-dark)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Page {page} of {licenseMeta.lastPage}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <button onClick={() => setPage(p => Math.min(licenseMeta.lastPage, p + 1))} disabled={page >= licenseMeta.lastPage} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page >= licenseMeta.lastPage ? 'not-allowed' : 'pointer', opacity: page >= licenseMeta.lastPage ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>
        </div>
      </div>

      <LicenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        license={selectedLicense}
        onSave={handleSave}
      />
    </div>
  );
}
