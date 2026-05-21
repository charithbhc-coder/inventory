import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ClipboardCheck, Search, Filter, Plus } from 'lucide-react';
import { format } from 'date-fns';
import gatePassService, { GatePass } from '@/services/gatePass.service';
import { GatePassStatus, AdminPermission } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import GatePassDetailDrawer from './GatePassDetailDrawer';
import CreateGatePassModal from './CreateGatePassModal';

const columnHelper = createColumnHelper<GatePass>();

const STATUS_STYLES: Record<GatePassStatus, { bg: string; color: string; label: string }> = {
  PENDING_APPROVAL: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pending Approval' },
  ACTIVE:           { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', label: 'Active' },
  RETURNED:         { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Returned' },
  CANCELLED:        { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

function StatusBadge({ status }: { status: GatePassStatus }) {
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

export default function GatePassesPage() {
  const { hasPermission } = useAuthStore();

  const canApprove = hasPermission(AdminPermission.APPROVE_GATE_PASS);
  const isRequesterOnly = !canApprove && hasPermission(AdminPermission.CREATE_GATE_PASS);

  const [statusFilter, setStatusFilter] = useState<GatePassStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selectedPass, setSelectedPass] = useState<GatePass | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: passes = [], isLoading } = useQuery({
    queryKey: isRequesterOnly
      ? ['gate-passes', 'mine']
      : ['gate-passes', { status: statusFilter }],
    queryFn: isRequesterOnly
      ? () => gatePassService.getMyRequests()
      : () => gatePassService.getAll(statusFilter ? { status: statusFilter as GatePassStatus } : undefined),
    enabled: canApprove || isRequesterOnly,
  });

  const filtered = search
    ? passes.filter((p) =>
        p.referenceNo.toLowerCase().includes(search.toLowerCase()) ||
        p.destination.toLowerCase().includes(search.toLowerCase()) ||
        (canApprove && `${p.createdByUser.firstName} ${p.createdByUser.lastName}`.toLowerCase().includes(search.toLowerCase()))
      )
    : passes;

  const columns = useMemo(() => [
    columnHelper.accessor('referenceNo', {
      header: 'Reference',
      cell: (info) => (
        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#818cf8' }}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('destination', {
      header: 'Destination',
      cell: (info) => <span style={{ fontSize: 13, fontWeight: 600 }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('items', {
      header: 'Items',
      cell: (info) => (
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          {info.getValue().length} item{info.getValue().length !== 1 ? 's' : ''}
        </span>
      ),
    }),
    ...(canApprove
      ? [
          columnHelper.accessor('createdByUser', {
            header: 'Requested By',
            cell: (info) => {
              const u = info.getValue();
              return <span style={{ fontSize: 13, fontWeight: 600 }}>{u.firstName} {u.lastName}</span>;
            },
          }),
        ]
      : []),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Submitted',
      cell: (info) => (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {format(new Date(info.getValue()), 'MMM dd, yyyy')}
        </span>
      ),
    }),
  ], [canApprove]);

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
            {isRequesterOnly ? 'My Gate Pass Requests' : 'Gate Passes'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {isRequesterOnly
              ? 'Track the status of gate pass requests you have submitted'
              : 'Manage and approve gate pass requests'}
          </p>
        </div>
        {hasPermission(AdminPermission.CREATE_GATE_PASS) && (
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={16} />
            New Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
            placeholder={isRequesterOnly ? 'Search reference or destination...' : 'Search reference, destination, requester...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canApprove && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} style={{ color: 'var(--color-text-muted)' }} />
            <select
              style={{ padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GatePassStatus | '')}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_STYLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={table.getVisibleLeafColumns().length} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} style={{ padding: 60, textAlign: 'center' }}>
                  <ClipboardCheck size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.4, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>No gate passes found</div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => { setSelectedPass(row.original); setIsDrawerOpen(true); }}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-dark)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {row.getVisibleCells().map((cell) => (
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

      {selectedPass && (
        <GatePassDetailDrawer
          passId={selectedPass.id}
          isOpen={isDrawerOpen}
          onClose={() => { setIsDrawerOpen(false); setSelectedPass(null); }}
        />
      )}

      <CreateGatePassModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
