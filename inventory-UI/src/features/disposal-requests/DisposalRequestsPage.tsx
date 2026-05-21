import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ClipboardList, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { disposalRequestService } from '@/services/disposal-request.service';
import { DisposalRequest, DisposalRequestStatus, AdminPermission } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import DisposalRequestDetailDrawer from './DisposalRequestDetailDrawer';

const columnHelper = createColumnHelper<DisposalRequest>();

const STATUS_STYLES: Record<DisposalRequestStatus, { bg: string; color: string; label: string }> = {
  PENDING_L1:  { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Awaiting L1 Review' },
  PENDING_L2:  { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', label: 'Awaiting Final Approval' },
  APPROVED:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Approved' },
  REJECTED:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Rejected' },
  CANCELLED:   { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

const CONDITION_LABELS: Record<string, string> = {
  BEYOND_REPAIR:     'Beyond Repair',
  OBSOLETE:          'Obsolete',
  UNUSED:            'Unused',
  PHYSICALLY_DAMAGED:'Damaged',
};

const METHOD_LABELS: Record<string, string> = {
  SCRAPPED:          'Scrapped',
  DONATED:           'Donated',
  RECYCLED:          'Recycled',
  SOLD:              'Sold',
  RETURNED_TO_VENDOR:'Return to Vendor',
};

function StatusBadge({ status }: { status: DisposalRequestStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
      textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
    }}>
      {s.label}
    </span>
  );
}

export default function DisposalRequestsPage() {
  const { hasPermission } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState<DisposalRequestStatus | ''>('');
  const [_companyFilter, _setCompanyFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DisposalRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['disposal-requests', { status: statusFilter, companyId: _companyFilter }],
    queryFn: () => disposalRequestService.getAll({
      status: statusFilter || undefined,
      companyId: _companyFilter || undefined,
    }),
    enabled:
      hasPermission(AdminPermission.MANAGE_DISPOSALS) ||
      hasPermission(AdminPermission.APPROVE_DISPOSAL_L1) ||
      hasPermission(AdminPermission.APPROVE_DISPOSAL_L2),
  });

  const filtered = search
    ? requests.filter(r =>
        r.item.name.toLowerCase().includes(search.toLowerCase()) ||
        r.item.barcode.toLowerCase().includes(search.toLowerCase()) ||
        `${r.requestedByUser.firstName} ${r.requestedByUser.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : requests;

  const columns = [
    columnHelper.accessor('item', {
      header: 'Asset',
      cell: info => {
        const item = info.getValue();
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.name}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{item.barcode}</div>
          </div>
        );
      },
    }),
    columnHelper.accessor('requestedByUser', {
      header: 'Requested By',
      cell: info => {
        const u = info.getValue();
        return <span style={{ fontSize: 13, fontWeight: 600 }}>{u.firstName} {u.lastName}</span>;
      },
    }),
    columnHelper.accessor('disposalCondition', {
      header: 'Condition',
      cell: info => (
        <span style={{ fontSize: 12, fontWeight: 700 }}>{CONDITION_LABELS[info.getValue()] || info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('proposedMethod', {
      header: 'Method',
      cell: info => (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{METHOD_LABELS[info.getValue()] || info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('requestedAt', {
      header: 'Submitted',
      cell: info => (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {format(new Date(info.getValue()), 'MMM dd, yyyy')}
        </span>
      ),
    }),
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Disposal Requests</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Review and approve asset disposal requests
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
            placeholder="Search asset, barcode, requester..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={15} style={{ color: 'var(--color-text-muted)' }} />
          <select
            style={{ padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as DisposalRequestStatus | '')}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 60, textAlign: 'center' }}>
                  <ClipboardList size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.4, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>No disposal requests found</div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => { setSelectedRequest(row.original); setIsDrawerOpen(true); }}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-dark)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ padding: '14px 16px' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <DisposalRequestDetailDrawer
          requestId={selectedRequest.id}
          isOpen={isDrawerOpen}
          onClose={() => { setIsDrawerOpen(false); setSelectedRequest(null); }}
        />
      )}
    </div>
  );
}
