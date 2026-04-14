import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { departmentService, Department } from '@/services/department.service';
import { companyService, Company } from '@/services/company.service';
import { itemService, Item } from '@/services/item.service';
import { Plus, Edit, Search, Building2, ShieldAlert, ShieldCheck, MapPin, LayoutGrid, ChevronLeft, ChevronRight, X, Package, Tag, Trash2 } from 'lucide-react';
import DepartmentModal from './DepartmentModal';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';
import { useEffect } from 'react';

const columnHelper = createColumnHelper<Department>();
const LIMIT = 15;

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  IN_USE:         { bg: 'rgba(16,185,129,0.12)',   color: '#10b981', label: 'In Use' },
  WAREHOUSE:      { bg: 'rgba(59,130,246,0.12)',   color: '#3b82f6', label: 'Warehouse' },
  IN_REPAIR:      { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b', label: 'In Repair' },
  SENT_TO_REPAIR: { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b', label: 'In Repair' },
  DISPOSED:       { bg: 'rgba(107,114,128,0.15)',  color: '#6b7280', label: 'Disposed' },
  LOST:           { bg: 'rgba(239,68,68,0.12)',    color: '#ef4444', label: 'Lost' },
};

export default function DepartmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search');
  const urlOpen = searchParams.get('open');

  const [search, setSearch]             = useState('');
  

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [page, setPage]                 = useState(1);

  // Drawer state
  const [drawerDept, setDrawerDept] = useState<Department | null>(null);

  const queryClient = useQueryClient();
  const hasPermission = useAuthStore(s => s.hasPermission);

  /* ── Companies dropdown ─────────────────────────────────── */
  const { data: companyData } = useQuery({
    queryKey: ['companies-all'],
    queryFn:  () => companyService.getCompanies({ limit: 100 }),
  });
  const companies: Company[] = useMemo(
    () => Array.isArray(companyData) ? companyData : (companyData as any)?.data || [],
    [companyData],
  );
  const activeCompanies = useMemo(() => companies.filter(c => c.isActive), [companies]);
  const effectiveCompanyId = selectedCompanyId || '';

  /* ── Departments query (server-side paginated) ──────────── */
  const { data: deptData, isLoading } = useQuery({
    queryKey: ['departments', effectiveCompanyId, search, page],
    queryFn:  () => departmentService.getDepartments(effectiveCompanyId || undefined, { search, page, limit: LIMIT }),
    placeholderData: (prev) => prev,
  });
  const departments: Department[] = useMemo(() => (deptData as any)?.data || [], [deptData]);

  // Combined Deep Link & Search Sync
  useEffect(() => {
    if (departments.length === 0) return;
    if (!urlOpen && !urlSearch) return;

    const newParams = new URLSearchParams(searchParams);
    let changed = false;

    if (urlOpen) {
      const match = departments.find(d => d.id === urlOpen);
      if (match) {
        setDrawerDept(match);
      }
      newParams.delete('open');
      changed = true;
    } else if (urlSearch) {
      const match = departments.find(d => d.code === urlSearch);
      if (match) {
        setDrawerDept(match);
      }
      // Sync search field
      if (!search) setSearch(urlSearch);
      
      newParams.delete('search');
      changed = true;
    }

    if (changed) {
      setSearchParams(newParams, { replace: true });
    }
  }, [urlOpen, urlSearch, departments, searchParams, setSearchParams]);

  const meta = useMemo(() => {
    const m = (deptData as any)?.meta;
    return { total: m?.total || 0, lastPage: m?.lastPage || m?.totalPages || 1 };
  }, [deptData]);

  /* ── Department items drawer query ──────────────────────── */
  const { data: drawerItemsData, isLoading: drawerLoading } = useQuery({
    queryKey: ['items', 'by-dept', drawerDept?.id],
    queryFn:  () => itemService.getItems({ departmentId: drawerDept!.id, limit: 50 }),
    enabled:  !!drawerDept,
  });
  const drawerItems: Item[] = useMemo(() => {
    if (!drawerItemsData) return [];
    return Array.isArray(drawerItemsData) ? drawerItemsData : (drawerItemsData as any)?.data || [];
  }, [drawerItemsData]);

  /* ── Mutations ──────────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: ({ companyId, payload }: { companyId: string; payload: any }) =>
      departmentService.createDepartment(companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
      toast.success('Department created successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create department'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      departmentService.updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
      toast.success('Department updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update department'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (dept: Department) =>
      departmentService.updateDepartment(dept.id, { isActive: !dept.isActive }),
    onSuccess: (_, dept) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success(`Department ${dept.isActive ? 'deactivated' : 'activated'} successfully`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update department status');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete department (it may have items or history)');
    }
  });

  const handleSave = (formData: any) => {
    if (selectedDept) {
      const { code, companyId, id, createdAt, updatedAt, ...safePayload } = formData;
      updateMutation.mutate({ id: selectedDept.id, payload: safePayload });
    } else {
      const { companyId, ...safePayload } = formData;
      createMutation.mutate({ companyId, payload: safePayload });
    }
  };

  // Reset page when filters change
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handleCompanyChange = (val: string) => { setSelectedCompanyId(val); setPage(1); };

  /* ── Columns ────────────────────────────────────────────── */
  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'DEPARTMENT',
      cell: info => {
        const name     = info.getValue();
        const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #00b9f7 0%, #009ad1 100%)',
              color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 12, border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 3px 12px rgba(0,185,247,0.2)', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 14, lineHeight: '1.2' }}>
                {name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {info.row.original.code}
              </span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('location', {
      header: 'LOCATION',
      cell: info => {
        const loc = info.getValue();
        return loc ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Blue location pin */}
            <MapPin size={13} color="#3b82f6" />
            <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{loc}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
        );
      },
    }),
    columnHelper.accessor('company', {
      header: 'COMPANY',
      cell: info => {
        const comp = info.getValue() as { name: string } | undefined;
        return (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
            {comp?.name || 'Unassigned'}
          </span>
        );
      },
    }),
    columnHelper.accessor('isActive', {
      header: 'STATUS',
      cell: info => {
        const isActive = info.getValue() !== false;
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <span style={{
              padding: '4px 12px', borderRadius: 50, fontSize: 10, fontWeight: 800,
              letterSpacing: '0.02em',
              background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: isActive ? '#10b981' : '#ef4444',
              border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
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
        const canEdit = hasPermission(AdminPermission.UPDATE_DEPARTMENTS);
        const canDelete = hasPermission(AdminPermission.DELETE_DEPARTMENTS);
        if (!canEdit && !canDelete) return null;
        return (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <button
              title="Edit Department"
              onClick={e => { e.stopPropagation(); setSelectedDept(info.row.original); setIsModalOpen(true); }}
              style={{
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#8b5cf6',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
            >
              <Edit size={16} />
            </button>
            {canEdit && (
              <button
                title={info.row.original.isActive ? 'Deactivate Department' : 'Activate Department'}
                onClick={e => { e.stopPropagation(); toggleStatusMutation.mutate(info.row.original); }}
                style={{
                  background: info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  border: `1px solid ${info.row.original.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
                  borderRadius: 8, padding: '7px', cursor: 'pointer',
                  color: info.row.original.isActive ? '#ef4444' : '#10b981',
                  display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)';
                }}
              >
                {info.row.original.isActive ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
              </button>
            )}
            {canDelete && (
              <button
                title="Delete Department"
                onClick={e => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete ${info.row.original.name}? This action is irreversible.`)) {
                    deleteMutation.mutate(info.row.original.id);
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#ef4444',
                  display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      },
    }),
  ], [hasPermission]);

  const activeDepartments = useMemo(() => departments.filter(d => d.isActive), [departments]);
  const inactiveDepartments = useMemo(() => departments.filter(d => !d.isActive), [departments]);

  const activeTable = useReactTable({
    data: activeDepartments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const inactiveTable = useReactTable({
    data: inactiveDepartments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page Header */}
      <header className="header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Departments
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            Organise and manage departments across your subsidiaries.
          </p>
        </div>
        {hasPermission(AdminPermission.CREATE_DEPARTMENTS) && (
          <div className="header-actions">
            <button
              className="primary-btn"
              onClick={() => { setSelectedDept(null); setIsModalOpen(true); }}
            >
              <Plus size={18} strokeWidth={3} />
              Add Department
            </button>
          </div>
        )}
      </header>

      {/* Main Card */}
      <div className="dark-card" style={{ padding: '24px 0 0', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div className="toolbar-container" style={{ padding: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrapper" style={{ position: 'relative', minWidth: 220 }}>
            <Building2 size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              value={selectedCompanyId}
              onChange={e => handleCompanyChange(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                borderRadius: 8, border: '1px solid var(--border-dark)',
                background: 'var(--search-bg)', color: 'var(--text-main)',
                fontSize: 13, appearance: 'none', cursor: 'pointer',
              }}
            >
              <option value="">ALL COMPANIES</option>
              {activeCompanies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="search-wrapper" style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search departments..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px 10px 42px',
                borderRadius: 8, border: '1px solid var(--border-dark)',
                background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {meta.total} total department{meta.total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 800 }}>
            {/* Fixed column widths — prevents layout shift on page change */}
            <colgroup>
              <col style={{ width: '30%' }} />{/* DEPARTMENT */}
              <col style={{ width: '18%' }} />{/* LOCATION */}
              <col style={{ width: '22%' }} />{/* COMPANY */}
              <col style={{ width: '14%' }} />{/* STATUS */}
              <col style={{ width: '16%' }} />{/* ACTIONS */}
            </colgroup>
            <thead>
              {activeTable.getHeaderGroups().map(hg => (
                <tr key={hg.id} style={{ borderBottom: '1px solid var(--border-dark)', background: 'rgba(0,0,0,0.04)' }}>
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      style={{
                        padding: '14px 24px',
                        textAlign: (header.id === 'actions') ? 'center' : 'left',
                        fontSize: 11, fontWeight: 700,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.5px',
                        verticalAlign: 'middle',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
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
                // Keep skeleton rows at same count so layout doesn't jump
                Array.from({ length: LIMIT }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-dark)', height: 65 }}>
                    <td colSpan={5} style={{ padding: '16px 24px' }}>
                      <div style={{ height: 16, borderRadius: 4, background: 'rgba(128,128,128,0.08)', width: `${60 + (i % 3) * 15}%` }} />
                    </td>
                  </tr>
                ))
              ) : activeDepartments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <LayoutGrid size={48} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>No active departments found.</p>
                  </td>
                </tr>
              ) : (
                <>
                  {activeTable.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid var(--border-dark)', cursor: 'pointer', height: 65 }}
                      className="table-row-hover"
                      onClick={() => setDrawerDept(row.original)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          style={{
                            padding: '16px 24px',
                            fontSize: 13,
                            color: 'var(--text-main)',
                            verticalAlign: 'middle',
                            textAlign: (cell.column.id === 'actions') ? 'center' : 'left',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-dark)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            Page {page} of {meta.lastPage}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-dark)',
                background: 'var(--search-bg)', color: 'var(--text-main)', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(meta.lastPage, p + 1))}
              disabled={page >= meta.lastPage}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-dark)',
                background: 'var(--search-bg)', color: 'var(--text-main)', cursor: page >= meta.lastPage ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: page >= meta.lastPage ? 0.4 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {inactiveDepartments.length > 0 && (
        <div className="dark-card" style={{ marginTop: 32 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Archived / Inactive Departments</h3>
          </div>
          <div style={{ overflowX: 'auto', opacity: 0.6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <tbody>
                {inactiveTable.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: '1px solid var(--border-dark)', cursor: 'pointer', height: 65 }}
                    className="table-row-hover"
                    onClick={() => setDrawerDept(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{
                          padding: '16px 24px',
                          fontSize: 13,
                          color: 'var(--text-main)',
                          verticalAlign: 'middle',
                          textAlign: (cell.column.id === 'actions') ? 'center' : 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
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

      {/* Modal */}
      <DepartmentModal
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
        dept={selectedDept}
        fixedCompanyId={effectiveCompanyId || undefined}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Department Items Drawer */}
      {drawerDept && (
        <>
          {/* Blurred backdrop */}
          <div
            onClick={() => {
              setDrawerDept(null);
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
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'linear-gradient(135deg, #00b9f7 0%, #009ad1 100%)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14, flexShrink: 0,
                    boxShadow: '0 4px 16px rgba(0,185,247,0.25)',
                  }}>
                    {drawerDept.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                      {drawerDept.name}
                    </h2>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'block' }}>{drawerDept.code}</span>
                  </div>
                </div>
                {drawerDept.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color="#3b82f6" />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{drawerDept.location}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setDrawerDept(null);
                  // Safety cleanup
                  if (searchParams.has('search') || searchParams.has('open')) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    newParams.delete('open');
                    setSearchParams(newParams, { replace: true });
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', transition: 'all 0.2s', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Dark body — item list */}
            <div className="drawer-body-content" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
                Items in this department ({drawerLoading ? '…' : drawerItems.length})
              </div>

              {drawerLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>
              ) : drawerItems.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <Package size={40} style={{ opacity: 0.15, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No items assigned to this department.</p>
                </div>
              ) : (
                drawerItems.map((item) => {
                  const s = STATUS_COLORS[item.status] || { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: item.status };
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '14px 16px', marginBottom: 8, borderRadius: 12,
                        border: '1px solid var(--border-dark)',
                        background: 'var(--bg-dark)',
                        display: 'flex', alignItems: 'center', gap: 14,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dark)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 8,
                          background: 'rgba(59,130,246,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          border: '1px solid rgba(59,130,246,0.15)',
                        }}>
                          <Package size={18} color="#3b82f6" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <Tag size={10} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.barcode}</span>
                          {item.category?.name && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• {item.category.name}</span>
                          )}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 50,
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', flexShrink: 0,
                        background: s.bg, color: s.color,
                        border: `1px solid ${s.color}33`,
                      }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })
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
          .toolbar-container {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .search-wrapper {
            max-width: 100% !important;
            flex: 1 1 100% !important;
          }
          .header-actions {
            width: 100%;
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
