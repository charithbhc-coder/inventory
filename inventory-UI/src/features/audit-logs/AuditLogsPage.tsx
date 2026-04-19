import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notification.store';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  History,
  Filter,
  Search,
  ListFilter
} from 'lucide-react';
import { auditLogService, AuditLog } from '@/services/audit-log.service';
import { companyService, Company } from '@/services/company.service';
import { userService, User } from '@/services/user.service';
import { format } from 'date-fns';

const columnHelper = createColumnHelper<AuditLog>();

const ACTION_MAP: Record<string, string> = {
  ITEM_ADDED: 'Asset Registered',
  ITEM_EDITED: 'Asset Updated',
  DISPOSED: 'Asset Disposed',
  ASSIGNED_TO_PERSON: 'Assigned to User',
  ASSIGNED_TO_DEPARTMENT: 'Assigned to Dept',
  UNASSIGNED: 'Returned to Custody',
  SENT_TO_REPAIR: 'Repair Initiated',
  RETURNED_FROM_REPAIR: 'Returned from Repair',
  REPORT_LOST: 'Reported Missing',
  STATUS_CHANGE: 'Status Modified',
  TRANSFERRED: 'Asset Transferred',
  CREATE_ITEM: 'Asset Registered',
  UPDATE_ITEM: 'Asset Updated',
  DELETE_ITEM: 'Asset Disposed',
  CREATE_COMPANY: 'Added Subsidiary',
  UPDATE_COMPANY: 'Updated Subsidiary',
  CREATE_USER: 'Registered User',
  UPDATE_USER: 'Updated User',
  CREATE_CATEGORY: 'Added Category',
  UPDATE_CATEGORY: 'Updated Category',
  CREATE_IMAGE: 'Uploaded Image',
  UPDATE_IMAGE: 'Updated Image',
  LOGIN: 'User Login',
  LOGIN_SUCCESS: 'User Login',
  LOGIN_FAILURE: 'Failed Login Attempt',
  LOGOUT: 'User Logout',
  PASSWORD_CHANGE: 'Password Changed',
  PASSWORD_RESET: 'Password Reset',
  ASSIGN_ITEM: 'Assigned to User',
  UNASSIGN_ITEM: 'Returned to Custody',
  REPAIR_ITEM: 'Repair Initiated',
  CREATE_ASSIGN: 'Assigned to User',
  CREATE_SCHEDULED: 'Report Scheduled',
  UPDATE_SCHEDULED: 'Report Schedule Updated',
  DELETE_SCHEDULED: 'Report Schedule Deleted',
  CREATE_SEND_EMAIL: 'Report Email Dispatched',
  CREATE_SCHEDULES: 'Report Scheduled',
  UPDATE_SCHEDULES: 'Report Schedule Updated',
  DELETE_SCHEDULES: 'Report Schedule Deleted',
  SEND_EMAIL: 'Report Email Dispatched',
  UPDATE_SCHEDULED_REPORTS: 'Report Schedule Updated',
  CREATE_SCHEDULED_REPORTS: 'Report Scheduled',
  GENERATE_EXCEL: 'Report Exported (Excel)',
  GENERATE_PDF: 'Report Exported (PDF)',
};

export default function AuditLogsPage() {
  const [searchFilter, setSearchFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const queryClient = useQueryClient();
  const socket = useNotificationStore((state) => state.socket);

  // Real-time refresh listener — subscribes reactively when socket connects
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    };

    socket.on('audit_log_updated', handleUpdate);
    return () => {
      socket.off('audit_log_updated', handleUpdate);
    };
  }, [socket, queryClient]);

  // Fetch Companies for mapping IDs to names (if needed)
  const { data: companiesData } = useQuery({
    queryKey: ['companies-all'],
    queryFn: () => companyService.getCompanies({ limit: 100 })
  });

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    const companies = Array.isArray(companiesData) ? companiesData : companiesData?.data || [];
    companies.forEach((c: Company) => {
      map[c.id] = c.name;
    });
    return map;
  }, [companiesData]);

  // Fetch Users for proper name mapping
  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => userService.getUsers({ limit: 500 })
  });

  const userMap = useMemo(() => {
    const map: Record<string, User> = {};
    const users = Array.isArray(usersData) ? usersData : usersData?.data || [];
    users.forEach((u: User) => {
      map[u.email] = u;
    });
    return map;
  }, [usersData]);


  // Removed unused user extraction

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit-logs', page, limit, searchFilter, userFilter, dateFilter],
    queryFn: () => auditLogService.getLogs({
      page,
      limit,
      search: searchFilter || undefined,
      userId: userFilter || undefined,
      startDate: dateFilter || undefined,
      endDate: dateFilter || undefined,
    }),
  });

  const logs = useMemo(() => {
    if (logsData && 'data' in logsData) return logsData.data;
    return [];
  }, [logsData]);

  const meta = useMemo(() => {
    if (logsData && 'meta' in logsData) {
      const m = logsData.meta as any;
      return {
        total: m.total || 0,
        page: m.page || 1,
        lastPage: m.lastPage || m.totalPages || 1,
        limit: m.limit || 15
      };
    }
    return { total: 0, page: 1, lastPage: 1, limit: 15 };
  }, [logsData]);

  const getInitials = (name: string) => {
    if (!name) return 'SY';
    const parts = name.trim().split(/[\.\s]+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0)) : (parts[0]?.charAt(1) ?? '');
    return (first + last).toUpperCase();
  };

  const columns = useMemo(() => [
    columnHelper.accessor('createdAt', {
      header: 'TIMESTAMP',
      cell: info => {
        const date = new Date(info.getValue());
        return (
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm timestamp-text">
              {format(date, 'MMM dd,')}
            </span>
            <span className="font-bold text-sm timestamp-text">
              {format(date, 'HH:mm:ss')}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('userEmail', {
      header: 'USER',
      cell: info => {
        const email = info.getValue() || 'System';
        const userObj = userMap[email];
        let displayName = email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

        if (userObj && userObj.firstName && userObj.lastName) {
          displayName = `${userObj.firstName} ${userObj.lastName}`;
        }

        const initials = getInitials(displayName);

        return (
          <div className="flex items-center justify-start gap-3">
            <div className="avatar-circle" style={{ backgroundColor: 'var(--color-surface-1, transparent)', color: '#00abff', border: '1px solid #00abff' }}>
              {initials}
            </div>
            <div className="flex flex-col max-w-[140px] text-left">
              <span className="font-bold text-sm text-primary truncate">{displayName}</span>
              <span className="text-[10px] text-muted truncate">{email}</span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('action', {
      header: 'ACTION',
      cell: info => {
        const rawAction = info.getValue() || '';
        const normalizedRawAction = String(rawAction).toUpperCase().replace(/-/g, '_');
        // Mask legacy UUIDs in old database records
        const sanitizedAction = normalizedRawAction.replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/g, 'ITEM');

        const friendlyAction = ACTION_MAP[normalizedRawAction] || ACTION_MAP[sanitizedAction] || sanitizedAction.replace(/_/g, ' ');
        const isFailed = normalizedRawAction.includes('FAILED') || info.row.original.newValues?.status === 'FAILED';

        const newVals = info.row.original.newValues || {};
        const oldVals = info.row.original.oldValues || {};

        const newName = newVals.assignedToName || newVals.toPersonName || newVals.name;
        const oldName = oldVals.assignedToName || oldVals.toPersonName || newVals.previousAssignedToName;

        let displayAction = friendlyAction;
        if (newName && (normalizedRawAction.includes('ASSIGN') || normalizedRawAction.includes('TRANS') || normalizedRawAction.includes('ADD'))) {
          displayAction = `Assigned to ${newName}`;
        } else if (normalizedRawAction.includes('UNASSIGN') && oldName) {
          displayAction = `Released from ${oldName}`;
        }

        let bg = 'var(--color-surface-2)';
        let color = 'var(--color-text-secondary)';
        let border = 'var(--color-border)';

        if (isFailed || normalizedRawAction.includes('FAILURE')) {
          bg = 'rgba(239, 68, 68, 0.1)'; color = '#ef4444'; border = 'rgba(239, 68, 68, 0.2)';
        } else if (normalizedRawAction.includes('ADD') || normalizedRawAction.includes('CREATE') || normalizedRawAction.includes('REGISTER')) {
          bg = 'rgba(16, 185, 129, 0.1)'; color = '#10b981'; border = 'rgba(16, 185, 129, 0.2)';
        } else if (normalizedRawAction.includes('ASSIGN') || normalizedRawAction.includes('TRANS') || normalizedRawAction.includes('LOGIN') || normalizedRawAction.includes('LOGOUT')) {
          bg = 'rgba(59, 130, 246, 0.1)'; color = '#3b82f6'; border = 'rgba(59, 130, 246, 0.2)';
        } else if (normalizedRawAction.includes('PASSWORD')) {
          bg = 'rgba(99, 102, 241, 0.1)'; color = '#6366f1'; border = 'rgba(99, 102, 241, 0.2)';
        } else if (normalizedRawAction.includes('REPAIR') || normalizedRawAction.includes('UPDATE') || normalizedRawAction.includes('EDIT')) {
          bg = 'rgba(246, 179, 11, 0.1)'; color = '#f6b30b'; border = 'rgba(246, 179, 11, 0.2)';
        } else if (normalizedRawAction.includes('DISPOSE') || normalizedRawAction.includes('LOST') || normalizedRawAction.includes('DELETE') || normalizedRawAction.includes('REMOVE')) {
          bg = 'rgba(244, 63, 94, 0.1)'; color = '#f43f5e'; border = 'rgba(244, 63, 94, 0.2)';
        }

        return (
          <div className="action-tag-premium" style={{ background: bg, color: color, borderColor: border }}>
            {displayAction}
          </div>
        );
      },
    }),

    columnHelper.accessor('ipAddress', {
      header: 'IP ADDRESS',
      cell: info => (
        <span className="font-medium text-sm text-muted">
          {info.getValue() || '::1'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'STATUS',
      cell: info => {
        const isFailed = info.row.original.action.includes('FAILED') || info.row.original.newValues?.status === 'FAILED';
        return (
          <div className={`badge ${isFailed ? 'badge-danger' : 'badge-success'}`}>
            {isFailed ? 'FAILED' : 'SUCCESS'}
          </div>
        );
      },
    }),
  ], [companyMap, userMap]);

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });


  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Standard Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Audit Logs</h1>
          <p>Immutable record of all system activities and administrative changes.</p>
        </div>
      </header>

      {/* Main Card Container */}
      <div className="card" style={{ padding: '24px 0 0', overflow: 'hidden', borderRadius: 0 }}>

        {/* Search & Filter Bar */}
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>

          <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: 300 }}>
            <Search size={16} className="text-muted filter-icon-anim" style={{ position: 'absolute', left: 16, top: 12 }} />
            <input
              type="text"
              placeholder="Search persons or actions..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="input yellow-placeholder-anim"
              style={{ paddingLeft: 42 }}
            />
          </div>

          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 250 }}>
            <Filter size={16} className="text-muted filter-icon-anim" style={{ position: 'absolute', left: 16, top: 12, pointerEvents: 'none' }} />
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="input yellow-placeholder-anim"
              style={{ paddingLeft: 42, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">All Users</option>
              {Object.values(userMap).map((u: User) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: 16, top: 12, pointerEvents: 'none' }}>
              <ListFilter size={16} className="text-muted filter-icon-anim" />
            </div>
          </div>

          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 200 }}>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="input yellow-placeholder-anim"
              style={{ paddingLeft: 16 }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive" style={{ whiteSpace: 'nowrap' }}>
          <table style={{ width: '100%', minWidth: 800 }}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} style={{ textAlign: (header.id === 'createdAt') ? 'left' : 'center', fontWeight: 800 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 60, textAlign: 'center' }}>
                    <div className="loading-spinner" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 80, textAlign: 'center' }}>
                    <History size={48} className="text-muted" style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p className="font-bold text-primary">No activity stream found</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr key={row.id} className="animated-row" style={{ animationDelay: `${i * 0.05}s` }}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ textAlign: (cell.column.id === 'createdAt' || cell.column.id === 'action' || cell.column.id === 'userEmail') ? 'left' : 'center' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-dark)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            Page {meta.page} of {meta.lastPage} &nbsp;•&nbsp; {meta.total} total entries
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
                background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
                cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
            <button
              onClick={() => setPage(p => Math.min(meta.lastPage, p + 1))}
              disabled={page >= meta.lastPage}
              style={{
                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
                background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
                cursor: page >= meta.lastPage ? 'not-allowed' : 'pointer', opacity: page >= meta.lastPage ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >›</button>
          </div>
        </div>
      </div>

      <style>{`
        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(245, 197, 24, 0.1);
          border-top: 3px solid var(--color-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .avatar-circle {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          box-shadow: var(--shadow-sm);
        }

        .action-tag-premium {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          background: var(--color-surface-2);
          padding: 6px 12px;
          border-radius: 8px;
          display: inline-block;
          white-space: nowrap;
          border: 1px solid var(--color-border);
        }
        .action-tag-premium.failed {
          color: var(--color-danger);
          background: var(--color-danger-bg);
          border-color: var(--color-danger);
        }

        html[data-theme="light"] .timestamp-text {
          color: #f6b30b; 
        }
        html[data-theme="dark"] .timestamp-text {
          color: var(--color-accent); /* Vibrant Yellow for dark */
        }

        /* Hover & Animation Styles */
        tr.animated-row {
          animation: fadeSlideUp 0.4s ease-out forwards;
          opacity: 0;
          transform: translateY(8px);
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        tr.animated-row:hover {
          background-color: var(--color-surface-2);
          cursor: default;
        }
        @keyframes fadeSlideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        th {
          padding-top: 16px;
          padding-bottom: 16px;
        }

        .yellow-placeholder-anim::placeholder {
          color: var(--color-text-muted);
          transition: color 0.3s ease, transform 0.3s ease;
        }
        .yellow-placeholder-anim:focus::placeholder {
          color: var(--color-accent) !important;
          opacity: 0.8;
          transform: translateX(4px);
        }
        
        .filter-input-group:focus-within .filter-icon-anim {
          color: var(--color-accent) !important;
        }
        
        .input:focus {
           border-color: var(--color-accent) !important;
           box-shadow: 0 0 0 4px rgba(245, 197, 24, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
