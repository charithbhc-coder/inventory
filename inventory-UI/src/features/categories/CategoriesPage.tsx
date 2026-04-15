import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Plus, Search, Tag, Edit, Layers, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { categoryService } from '@/services/category.service';
import CategoryModal from './CategoryModal';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  parentCategoryId?: string | null;
  parent?: { id: string; name: string } | null;
}

const columnHelper = createColumnHelper<Category>();

export default function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search');
  const urlOpen = searchParams.get('open');

  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s: any) => s.hasPermission);

  const toggleStatusMutation = useMutation({
    mutationFn: (cat: Category) => categoryService.updateCategory(cat.id, { isActive: !cat.isActive }),
    onSuccess: (_, cat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`Category ${cat.isActive ? 'deactivated' : 'activated'} successfully`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update category status');
    }
  });


  const { data: catData, isLoading } = useQuery({
    queryKey: ['categories', search, page],
    queryFn: () => categoryService.getCategories({ search, limit: 15, page }),
    placeholderData: (prev) => prev,
  });

  const categories: Category[] = useMemo(() => {
    const raw = catData;
    const items = Array.isArray(raw) ? raw : (raw as any)?.data || (raw as any)?.items || [];
    return items;
  }, [catData]);

  const activeCategories = useMemo(() => categories.filter(c => c.isActive !== false), [categories]);
  const inactiveCategories = useMemo(() => categories.filter(c => c.isActive === false), [categories]);

  // Combined Deep Link & Search Sync
  useEffect(() => {
    if (categories.length === 0) return;
    if (!urlOpen && !urlSearch) return;

    const newParams = new URLSearchParams(searchParams);
    let changed = false;

    if (urlOpen) {
      const match = categories.find(c => c.id === urlOpen);
      if (match) {
        setSelectedCategory(match);
        setIsModalOpen(true);
      }
      newParams.delete('open');
      changed = true;
    } else if (urlSearch) {
      const match = categories.find(c => c.code === urlSearch);
      if (match) {
        setSelectedCategory(match);
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
  }, [urlOpen, urlSearch, categories, searchParams, setSearchParams]);

  const catMeta = useMemo(() => (catData as any)?.meta || { total: categories.length, lastPage: 1 }, [catData]);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'CATEGORY NAME',
      cell: info => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,224,83,0.08)',
            color: 'var(--accent-yellow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,224,83,0.15)', flexShrink: 0,
          }}>
            {info.row.original.parent ? <Tag size={18} /> : <Layers size={18} />}
          </div>
          <div>
            {info.row.original.parent && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span>{info.row.original.parent.name}</span>
                <ChevronRight size={10} />
              </div>
            )}
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 13 }}>
              {info.getValue()}
            </span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('code', {
      header: 'CODE',
      cell: info => (
        <span style={{
          fontFamily: 'monospace', fontWeight: 800, fontSize: 13,
          background: 'rgba(0,0,0,0.05)', padding: '4px 10px',
          borderRadius: 6, color: 'var(--text-main)',
          border: '1px solid var(--border-dark)'
        }}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('description', {
      header: 'DESCRIPTION',
      cell: info => <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('isActive', {
      header: 'STATUS',
      cell: info => (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 50, fontSize: 10, fontWeight: 800,
          background: info.getValue() ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: info.getValue() ? '#10b981' : '#ef4444',
          border: `1px solid ${info.getValue() ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          textTransform: 'uppercase',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: info.getValue() ? '#10b981' : '#ef4444' }} />
          {info.getValue() ? 'Active' : 'Inactive'}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'ACTIONS',
      cell: info => {
        const canEdit = hasPermission(AdminPermission.UPDATE_CATEGORIES);
        const canDelete = hasPermission(AdminPermission.DELETE_CATEGORIES);
        if (!canEdit && !canDelete) return null;

        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {canEdit && (
            <button
              title="Edit Category"
              onClick={() => { setSelectedCategory(info.row.original); setIsModalOpen(true); }}
              style={{
                background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#8b5cf6',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 245, 0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'; }}
            >
              <Edit size={15} />
            </button>
          )}
          {canEdit && (
            <button
              title={info.row.original.isActive ? "Deactivate Category" : "Activate Category"}
              onClick={() => toggleStatusMutation.mutate(info.row.original)}
              style={{
                background: info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${info.row.original.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
                borderRadius: 8, padding: '7px', cursor: 'pointer',
                color: info.row.original.isActive ? '#ef4444' : '#10b981',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = info.row.original.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'; }}
            >
              {info.row.original.isActive ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
            </button>
          )}
        </div>
        );
      },
    }),
  ], []);

  const activeTable = useReactTable({ data: activeCategories, columns, getCoreRowModel: getCoreRowModel() });
  const inactiveTable = useReactTable({ data: inactiveCategories, columns, getCoreRowModel: getCoreRowModel() });

  const topLevelCount = categories.filter(c => !c.parentCategoryId).length;
  const subCategoryCount = categories.filter(c => !!c.parentCategoryId).length;

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Asset Categories
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            Organize your inventory with hierarchical categories (e.g. IT Hardware → Laptop).
          </p>
        </div>
        {hasPermission(AdminPermission.CREATE_CATEGORIES) && (
          <button
            className="primary-btn"
            onClick={() => { setSelectedCategory(null); setIsModalOpen(true); }}
          >
            <Plus size={18} strokeWidth={3} />
            Add Category
          </button>
        )}
      </header>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Top-Level Groups', value: topLevelCount, color: 'var(--accent-yellow)' },
          { label: 'Sub-Categories', value: subCategoryCount, color: '#3b82f6' },
          { label: 'Total Active', value: categories.filter(c => c.isActive).length, color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} className="dark-card" style={{ padding: '16px 24px', flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="dark-card" style={{ padding: '24px 0 0', overflow: 'hidden' }}>
        {/* Search Toolbar */}
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '0 0 320px', minWidth: 280 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 12 }} />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '10px 16px 10px 42px',
                borderRadius: 8, border: '1px solid var(--border-dark)',
                background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              {activeTable.getHeaderGroups().map(hg => (
                <tr key={hg.id} style={{ borderBottom: '1px solid var(--border-dark)', background: 'rgba(0,0,0,0.04)' }}>
                  {hg.headers.map(header => (
                    <th key={header.id} style={{
                      padding: '14px 24px',
                      textAlign: header.id === 'actions' ? 'center' : 'left',
                      fontSize: 11, fontWeight: 700,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ width: 30, height: 30, border: '3px solid rgba(255,224,83,0.1)', borderTop: '3px solid var(--accent-yellow)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                    <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>Loading categories...</p>
                  </td>
                </tr>
              ) : activeCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Tag size={48} style={{ opacity: 0.1, margin: '0 auto 16px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>No active categories</p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.6 }}>Add a category or search for something else</p>
                  </td>
                </tr>
              ) : (
                activeTable.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-dark)' }} className="table-row-hover">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{
                        padding: '14px 24px', fontSize: 13, color: 'var(--text-main)', verticalAlign: 'middle',
                        textAlign: cell.column.id === 'actions' ? 'center' : 'left',
                      }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Footer Pagination */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px 24px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          <strong>{catMeta.total}</strong> categories total &nbsp;•&nbsp; Page {page} of {catMeta.lastPage}
        </p>
        {catMeta.lastPage > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <button onClick={() => setPage(p => Math.min(catMeta.lastPage, p + 1))} disabled={page >= catMeta.lastPage} style={{
              width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 16,
              cursor: page >= catMeta.lastPage ? 'not-allowed' : 'pointer', opacity: page >= catMeta.lastPage ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>
        )}
      </div>

      {inactiveCategories.length > 0 && (
        <div className="dark-card" style={{ marginTop: 32, padding: '24px 0 0', overflow: 'hidden' }}>
          <div style={{ padding: '0 24px 20px', borderBottom: '1px solid var(--border-dark)' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
              Archived / Inactive Categories
            </h3>
          </div>
          <div style={{ overflowX: 'auto', opacity: 0.7 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {inactiveTable.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-dark)' }} className="table-row-hover">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{
                        padding: '14px 24px', fontSize: 13, color: 'var(--text-main)', verticalAlign: 'middle',
                        textAlign: cell.column.id === 'actions' ? 'center' : 'left',
                      }}>
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

      <CategoryModal
        category={selectedCategory}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
          // Safety: Clear deep link params if they still exist
          if (searchParams.has('search') || searchParams.has('open')) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('search');
            newParams.delete('open');
            setSearchParams(newParams, { replace: true });
          }
        }}
      />



      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes modalPopover { from { opacity: 0; transform: translate(-50%, -45%) scale(0.95); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      `}</style>
    </div>
  );
}
