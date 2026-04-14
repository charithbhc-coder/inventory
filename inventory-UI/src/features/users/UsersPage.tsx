import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable 
} from '@tanstack/react-table';
import { userService, User } from '@/services/user.service';
import { Plus, Edit, Search, UserCircle, ShieldAlert, Shield, ShieldCheck } from 'lucide-react';
import UserModal from './UserModal';
import PermissionsModal from './PermissionsModal';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

const columnHelper = createColumnHelper<User>();

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlOpen = searchParams.get('open');
  const urlSearch = searchParams.get('search');

  const [search, setSearch] = useState('');


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissionsModalUser, setPermissionsModalUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const LIMIT = 15;
  
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const hasPermission = useAuthStore(s => s.hasPermission);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => userService.getUsers({ search, limit: LIMIT, page }),
    placeholderData: (prev) => prev,
  });

  const users: User[] = useMemo(() => {
    const rawUsers: User[] = Array.isArray(data) ? data : (data as any)?.data || [];
    
    // Custom Sort Logic:
    // 1. Position SUPER_ADMIN at the very top
    // 2. Sort all others by createdAt (Newest first)
    return [...rawUsers].sort((a, b) => {
      const aIsSuper = a.role === 'SUPER_ADMIN';
      const bIsSuper = b.role === 'SUPER_ADMIN';

      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data]);

  // Combined Deep Link & Search Sync
  useEffect(() => {
    if (users.length === 0) return;
    if (!urlOpen && !urlSearch) return;

    const newParams = new URLSearchParams(searchParams);
    let changed = false;

    if (urlOpen) {
      const match = users.find(u => u.id === urlOpen);
      if (match) {
        setSelectedUser(match);
        setIsModalOpen(true);
      }
      newParams.delete('open');
      changed = true;
    } else if (urlSearch) {
      const match = users.find(u => u.email === urlSearch);
      if (match) {
        setSelectedUser(match);
        setIsModalOpen(true);
      }
      // Sync search field
      if (!search) setSearch(urlSearch);
      
      newParams.delete('search');
      changed = true;
    }

    if (changed) {
      setSearchParams(newParams, { replace: true });
    }
  }, [urlOpen, urlSearch, users, searchParams, setSearchParams]);
  const userMeta = useMemo(() => (data as any)?.meta || { total: users.length, lastPage: 1 }, [data]);

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      toast.success('Staff member added successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add staff member');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<User> }) => userService.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      toast.success('Staff profile updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => userService.setStatus(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update user status');
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => userService.updatePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPermissionsModalUser(null);
      toast.success('Permissions successfully updated');
    }
  });

  const handleSave = (formData: Partial<User>) => {
    if (selectedUser) {
      const { id, email, createdAt, company, permissions, isActive, ...safePayload } = formData as any;
      updateMutation.mutate({ id: selectedUser.id, payload: safePayload });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('firstName', {
      header: 'NAME',
      cell: info => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ 
            width: 38, height: 38, borderRadius: '50%', 
            background: info.row.original.avatarUrl ? 'var(--bg-dark)' : 'linear-gradient(135deg, #fff01f 0%, #e6d81c 100%)', 
            color: '#111', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontWeight: 900, fontSize: 13, border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: info.row.original.avatarUrl ? 'none' : '0 3px 12px rgba(255, 240, 31, 0.2)',
            transition: 'transform 0.2s ease',
            overflow: 'hidden'
          }}>
             {info.row.original.avatarUrl ? (
               <img 
                 src={`${import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${info.row.original.avatarUrl.startsWith('/') ? '' : '/'}${info.row.original.avatarUrl}`} 
                 alt="" 
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
               />
             ) : (
               <>{(info.row.original.firstName?.[0] || '').toUpperCase()}{(info.row.original.lastName?.[0] || '').toUpperCase()}</>
             )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 14 }}>{info.getValue()} {info.row.original.lastName}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.row.original.email}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'ROLE',
      cell: info => {
        const val = info.getValue() || 'STAFF';
        let color = '#a78bfa'; // Violet for custom roles
        let bg = 'rgba(167, 139, 250, 0.1)';
        
        if (val === 'SUPER_ADMIN') { color = '#f87171'; bg = 'rgba(248, 113, 113, 0.1)'; }
        else if (val === 'COMPANY ADMIN') { color = '#60a5fa'; bg = 'rgba(96, 165, 250, 0.1)'; }
        
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
    columnHelper.accessor('company', {
      header: 'AFFILIATION',
      cell: info => info.getValue() ? <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-main)' }}>{info.getValue()?.name}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>System Wide</span>,
    }),
    columnHelper.accessor('isActive', {
      header: 'STATUS',
      cell: info => {
        const active = info.getValue();
        return (
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: 50, 
            fontSize: 10, 
            fontWeight: 800, 
            letterSpacing: '0.02em',
            background: active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
            color: active ? '#10b981' : '#ef4444',
            border: `1px solid ${active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            {active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'SECURITY',
      cell: info => {
        if (!hasPermission(AdminPermission.UPDATE_USERS)) return null;

        return (
          <div style={{ 
          display: 'flex', 
          gap: 10, 
          justifyContent: 'center', 
          alignItems: 'center', 
          opacity: info.row.original.id === currentUser?.id ? 0.3 : 1, 
          pointerEvents: info.row.original.id === currentUser?.id ? 'none' : 'auto', 
          height: '100%',
          paddingRight: 0
        }}>
          <button 
            title="Configure Security Access"
            onClick={() => setPermissionsModalUser(info.row.original)}
            style={{ 
              background: 'rgba(245, 197, 24, 0.1)', 
              border: '1px solid rgba(245, 197, 24, 0.2)', 
              borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#e6b800', 
              display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245, 197, 24, 0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245, 197, 24, 0.1)'; }}
          >
            <Shield size={16} />
          </button>
          <button 
            title={info.row.original.isActive ? "Deactivate User" : "Activate User"}
            onClick={() => toggleStatusMutation.mutate({ id: info.row.original.id, isActive: !info.row.original.isActive })}
            style={{ 
              background: info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
              border: `1px solid ${info.row.original.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`, 
              borderRadius: 8, padding: '7px', cursor: 'pointer', 
              color: info.row.original.isActive ? '#ef4444' : '#10b981', 
              display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'; }}
          >
            {info.row.original.isActive ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
          </button>
          <button 
            title="Edit Detailed Profile"
            onClick={() => { setSelectedUser(info.row.original); setIsModalOpen(true); }}
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
  ], [currentUser?.id]);

  const activeUsers = useMemo(() => users.filter(u => u.isActive), [users]);
  const inactiveUsers = useMemo(() => users.filter(u => !u.isActive), [users]);

  const activeTable = useReactTable({
    data: activeUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const inactiveTable = useReactTable({
    data: inactiveUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ padding: '0 0 40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Staff Matrix</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Add personnel, manage roles, and control access levels.</p>
        </div>
        {hasPermission(AdminPermission.CREATE_USERS) && (
          <button 
            className="primary-btn" 
            onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          >
            <Plus size={18} /> Add Staff
          </button>
        )}
      </header>

      <div className="dark-card">
        {/* Toolbar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search staff by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13 }}
            />
          </div>
        </div>

        {/* Active Table */}
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              {activeTable.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border-dark)', background: 'rgba(0,0,0,0.1)' }}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      style={{ 
                        padding: '16px 24px', 
                        textAlign: header.id === 'actions' ? 'center' : 'left', 
                        fontSize: 11, 
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
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading active staff...</td></tr>
              ) : activeUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <UserCircle size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>No active users found.</p>
                  </td>
                </tr>
              ) : (
                activeTable.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-dark)' }} className="table-row-hover">
                    {row.getVisibleCells().map(cell => (
                      <td 
                        key={cell.id} 
                        style={{ 
                          padding: '16px 24px', 
                          fontSize: 13, 
                          color: 'var(--text-main)',
                          textAlign: (cell.column.id === 'actions' || cell.column.id === 'security') ? 'center' : 'left'
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Page {page} of {userMeta.lastPage}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <button onClick={() => setPage(p => Math.min(userMeta.lastPage, p + 1))} disabled={page >= userMeta.lastPage} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page >= userMeta.lastPage ? 'not-allowed' : 'pointer', opacity: page >= userMeta.lastPage ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>
        </div>
      </div>

      {inactiveUsers.length > 0 && (
        <div className="dark-card" style={{ marginTop: 32 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Archived / Inactive Staff</h3>
          </div>
          <div className="table-responsive" style={{ opacity: 0.6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <tbody>
                {inactiveTable.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-dark)' }} className="table-row-hover">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-main)' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // Safety: Clear deep link params if they still exist
          if (searchParams.has('search') || searchParams.has('open')) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('search');
            newParams.delete('open');
            setSearchParams(newParams, { replace: true });
          }
        }}
        user={selectedUser}
        onSave={handleSave}
      />

      <PermissionsModal 
        isOpen={!!permissionsModalUser}
        onClose={() => setPermissionsModalUser(null)}
        user={permissionsModalUser}
        onSave={(permissions) => {
          if (permissionsModalUser) {
            updatePermissionsMutation.mutate({ id: permissionsModalUser.id, permissions });
          }
        }}
      />
    </div>
  );
}
