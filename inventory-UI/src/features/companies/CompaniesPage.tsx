import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable 
} from '@tanstack/react-table';
import { companyService, Company } from '@/services/company.service';
import { departmentService, Department } from '@/services/department.service';
import { Plus, Edit, Search, Building2, Eye, ShieldAlert, ShieldCheck, X, MapPin, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import CompanyModal from './CompanyModal';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

const columnHelper = createColumnHelper<Company>();
const LIMIT = 10;

export default function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search');
  const urlOpen = searchParams.get('open');

  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [drawerCompany, setDrawerCompany] = useState<Company | null>(null);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // const user = useAuthStore(s => s.user); // Removed unused variable
  const hasPermission = useAuthStore(s => s.hasPermission);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', search, page],
    queryFn: () => companyService.getCompanies({ search, page, limit: LIMIT }),
    placeholderData: (prev) => prev,
  });

  const companies: Company[] = useMemo(() => Array.isArray(data) ? data : (data as any)?.data || [], [data]);
  const meta = useMemo(() => (data as any)?.meta || { total: companies.length, lastPage: 1 }, [data]);

  // Combined Deep Link & Search Sync
  useEffect(() => {
    if (companies.length === 0) return;
    if (!urlOpen && !urlSearch) return;

    const newParams = new URLSearchParams(searchParams);
    let changed = false;

    if (urlOpen) {
      const match = companies.find((c: Company) => c.id === urlOpen);
      if (match) {
        setDrawerCompany(match);
      }
      newParams.delete('open');
      changed = true;
    } else if (urlSearch) {
      const match = companies.find((c: Company) => c.code === urlSearch);
      if (match) {
        setDrawerCompany(match);
      }
      // Sync search field
      if (!search) setSearch(urlSearch);
      
      newParams.delete('search');
      changed = true;
    }

    if (changed) {
      setSearchParams(newParams, { replace: true });
    }
  }, [urlOpen, urlSearch, companies, searchParams, setSearchParams]);

  // Department drawer query
  const { data: drawerDeptsData, isLoading: drawerLoading } = useQuery({
    queryKey: ['departments', 'by-company', drawerCompany?.id],
    queryFn: () => departmentService.getDepartments(drawerCompany!.id, { limit: 50 }),
    enabled: !!drawerCompany,
  });
  const drawerDepts: Department[] = useMemo(() => {
    if (!drawerDeptsData) return [];
    return (drawerDeptsData as any)?.data || [];
  }, [drawerDeptsData]);

  const createMutation = useMutation({
    mutationFn: companyService.createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsModalOpen(false);
      toast.success('Company created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create company');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<Company> }) => companyService.updateCompany(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsModalOpen(false);
      toast.success('Company details updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update company');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => {
      const comp = companies.find(c => c.id === id);
      return companyService.updateCompany(id, { isActive: !comp?.isActive });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      const comp = companies.find(c => c.id === id);
      toast.success(`Company ${comp?.isActive ? 'deactivated' : 'activated'} successfully`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update company status');
    }
  });

  const handleSave = (formData: Partial<Company>) => {
    if (selectedCompany) {
      const { code, id, createdAt, updatedAt, logoUrl, isActive, ...safePayload } = formData as any;
      updateMutation.mutate({ id: selectedCompany.id, payload: safePayload });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'COMPANY NAME',
      cell: info => {
        const name = info.getValue();
        const initials = name.split(' ').map((word: string) => word[0]).join('').substring(0, 2).toUpperCase();
        const rawLogoUrl = info.row.original.logoUrl;
        
        // Safe image resolver for relative/absolute paths
        const resolveImageUrl = (url: string | null | undefined) => {
          if (!url) return null;
          if (url.startsWith('http')) return url;
          const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
          const origin = baseUrl.startsWith('http') ? new URL(baseUrl).origin : window.location.origin;
          return `${origin}${url}`;
        };

        const logoUrl = resolveImageUrl(rawLogoUrl);

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ 
              width: 38, height: 38, borderRadius: 12, 
              background: 'linear-gradient(135deg, #fff01f 0%, #e6d81c 100%)', 
              color: '#111', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontWeight: 800, fontSize: 13, border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 3px 12px rgba(255, 240, 31, 0.2)',
              overflow: 'hidden', flexShrink: 0
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span 
                onClick={e => { e.stopPropagation(); navigate(`/companies/${info.row.original.id}`); }}
                style={{ fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer', fontSize: 14, lineHeight: '1.2' }}
              >
                {name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{info.row.original.code}</span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('code', {
      header: 'CODE',
      cell: info => <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('email', {
      header: 'CONTACT',
      cell: info => (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontWeight: 600, lineHeight: '1.2', color: 'var(--text-main)' }}>{info.getValue() || '-'}</span>
          {info.row.original.phone && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{info.row.original.phone}</span>}
        </div>
      ),
    }),
    columnHelper.accessor('isActive', {
      header: 'STATUS',
      cell: info => {
        const isActive = info.getValue() !== false;
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <span style={{ 
              padding: '4px 12px', borderRadius: 50, fontSize: 10, fontWeight: 800, letterSpacing: '0.02em',
              background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
              color: isActive ? '#10b981' : '#ef4444',
              border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'ACTIONS',
      cell: info => {
        if (!hasPermission(AdminPermission.UPDATE_COMPANIES)) return null;
        return (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <button 
              title="View Profile"
              onClick={e => { e.stopPropagation(); navigate(`/companies/${info.row.original.id}`); }}
              style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', height: 32, width: 32, justifyContent: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; }}
            >
              <Eye size={16} />
            </button>
            <button 
              title="Edit Base Info"
              onClick={e => { e.stopPropagation(); setSelectedCompany(info.row.original); setIsModalOpen(true); }}
              style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#8b5cf6', display: 'flex', alignItems: 'center', height: 32, width: 32, justifyContent: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'; }}
            >
              <Edit size={16} />
            </button>
            <button 
              title={info.row.original.isActive ? "Deactivate Company" : "Activate Company"}
              onClick={e => { e.stopPropagation(); toggleStatusMutation.mutate(info.row.original.id); }}
              style={{ 
                background: info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
                border: `1px solid ${info.row.original.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`, 
                borderRadius: 8, padding: '7px', cursor: 'pointer', 
                color: info.row.original.isActive ? '#ef4444' : '#10b981', 
                display: 'flex', alignItems: 'center', height: 32, width: 32, justifyContent: 'center', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'; }}
            >
              {info.row.original.isActive ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            </button>
          </div>
        );
      },
    }),
  ], [navigate, hasPermission]);



  const activeCompanies = useMemo(() => companies.filter(c => c.isActive), [companies]);
  const inactiveCompanies = useMemo(() => companies.filter(c => !c.isActive), [companies]);

  const activeTable = useReactTable({
    data: activeCompanies,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const inactiveTable = useReactTable({
    data: inactiveCompanies,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ padding: '0 0 40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>Subsidiaries</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Manage all branch companies and organizations.</p>
        </div>
        {hasPermission(AdminPermission.CREATE_COMPANIES) && (
          <div className="header-actions">
            <button className="primary-btn" onClick={() => { setSelectedCompany(null); setIsModalOpen(true); }}>
              <Plus size={18} strokeWidth={3} />
              Add Company
            </button>
          </div>
        )}
      </header>
      
      <div className="dark-card" style={{ padding: '24px 0 0', overflow: 'hidden' }}>
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-container" style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 12 }} />
            <input 
              type="text" 
              placeholder="Search subsidiaries..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '10px 16px 10px 42px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13 }}
            />
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {meta.total} total
          </div>
        </div>

        {/* Table with fixed layout */}
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 800 }}>
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              {activeTable.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border-dark)', background: 'rgba(0,0,0,0.04)' }}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      style={{ 
                        padding: '14px 24px', 
                        textAlign: header.id === 'actions' ? 'center' : 'left', 
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', 
                        letterSpacing: '0.5px', verticalAlign: 'middle', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
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
                Array.from({ length: LIMIT }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-dark)', height: 65 }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(128,128,128,0.08)', flexShrink: 0 }} />
                        <div style={{ height: 14, borderRadius: 4, background: 'rgba(128,128,128,0.08)', width: `${40 + (i % 4) * 12}%` }} />
                      </div>
                    </td>
                    <td colSpan={4} style={{ padding: '16px 24px' }}>
                      <div style={{ height: 14, borderRadius: 4, background: 'rgba(128,128,128,0.06)', width: '40%' }} />
                    </td>
                  </tr>
                ))
              ) : activeCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Building2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>No active companies found.</p>
                  </td>
                </tr>
              ) : (
                activeTable.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id} 
                    style={{ borderBottom: '1px solid var(--border-dark)', height: 65, cursor: 'pointer' }} 
                    className="table-row-hover"
                    onClick={() => setDrawerCompany(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td 
                        key={cell.id} 
                        style={{ 
                          padding: '16px 24px', fontSize: 13, color: 'var(--text-main)', 
                          verticalAlign: 'middle',
                          textAlign: (cell.column.id === 'actions') ? 'center' : 'left',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
          padding: '14px 24px', borderTop: '1px solid var(--border-dark)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Page {page} of {meta.lastPage}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <button onClick={() => setPage(p => Math.min(meta.lastPage, p + 1))} disabled={page >= meta.lastPage} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page >= meta.lastPage ? 'not-allowed' : 'pointer', opacity: page >= meta.lastPage ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>
        </div>
      </div>

      {inactiveCompanies.length > 0 && (
        <div className="dark-card" style={{ marginTop: 32 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Archived / Inactive Subsidiaries</h3>
          </div>
          <div className="table-responsive" style={{ opacity: 0.6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 800 }}>
              <colgroup>
                <col style={{ width: '32%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <tbody>
                {inactiveTable.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id} 
                    style={{ borderBottom: '1px solid var(--border-dark)', height: 65, cursor: 'pointer' }} 
                    className="table-row-hover"
                    onClick={() => setDrawerCompany(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td 
                        key={cell.id} 
                        style={{ 
                          padding: '16px 24px', fontSize: 13, color: 'var(--text-main)', 
                          verticalAlign: 'middle',
                          textAlign: (cell.column.id === 'actions') ? 'center' : 'left',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
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

      <CompanyModal 
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
        company={selectedCompany} 
        onSave={handleSave} 
      />

      {/* Departments Drawer */}
      {drawerCompany && (
        <>
          {/* Blurred backdrop */}
          <div
            onClick={() => {
              setDrawerCompany(null);
              // Safety cleanup
              if (searchParams.has('search') || searchParams.has('open')) {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('search');
                newParams.delete('open');
                setSearchParams(newParams, { replace: true });
              }
            }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, backdropFilter: 'blur(4px)' }}
          />
          {/* Glassy dark panel */}
          <div className="drawer-panel" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 460,
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-dark)',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
            animation: 'drawerSlideIn 0.3s cubic-bezier(0.2,0.8,0.2,1)',
          }}>
            {/* Dark header */}
            <div className="drawer-header-content" style={{
              padding: '28px 28px 22px',
              background: 'var(--bg-sidebar)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg, #fff01f 0%, #e6d81c 100%)',
                  color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 15, overflow: 'hidden', flexShrink: 0,
                  boxShadow: '0 4px 16px rgba(255,240,31,0.25)',
                }}>
                  {drawerCompany.logoUrl ? (
                    <img 
                      src={drawerCompany.logoUrl.startsWith('http') 
                        ? drawerCompany.logoUrl 
                        : `${import.meta.env.VITE_API_BASE_URL}${drawerCompany.logoUrl}`
                      } 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    drawerCompany.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>{drawerCompany.name}</h2>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'block' }}>{drawerCompany.code} • {drawerCompany.email || 'No email'}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setDrawerCompany(null);
                  // Safety cleanup
                  if (searchParams.has('search') || searchParams.has('open')) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    newParams.delete('open');
                    setSearchParams(newParams, { replace: true });
                  }
                }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Dark body */}
            <div className="drawer-body-content" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
                Departments ({drawerLoading ? '…' : drawerDepts.length})
              </div>
              {drawerLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>
              ) : drawerDepts.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <LayoutGrid size={40} style={{ opacity: 0.15, display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No departments in this company.</p>
                </div>
              ) : (
                drawerDepts.map(dept => (
                  <div key={dept.id} style={{
                    padding: '14px 16px', marginBottom: 8, borderRadius: 12,
                    border: '1px solid var(--border-dark)',
                    background: 'var(--bg-dark)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,185,247,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dark)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'linear-gradient(135deg, #00b9f7 0%, #009ad1 100%)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12, flexShrink: 0,
                      boxShadow: '0 3px 10px rgba(0,185,247,0.2)',
                    }}>
                      {dept.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dept.code}</span>
                        {dept.location && (
                          <>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>•</span>
                            <MapPin size={10} color="#3b82f6" />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dept.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, flexShrink: 0,
                      background: dept.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: dept.isActive ? '#10b981' : '#ef4444',
                      border: `1px solid ${dept.isActive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    }}>
                      {dept.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      <style>{`
        @keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        
        @media (max-width: 768px) {
          .drawer-panel {
            width: 100% !important;
          }
          .drawer-header-content {
            padding: 24px 20px !important;
          }
          .drawer-body-content {
            padding: 20px !important;
          }
          .search-container {
            max-width: 100% !important;
            flex: 1 1 100% !important;
          }
          .header-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .header-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
