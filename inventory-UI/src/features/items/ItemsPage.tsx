import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { 
  Plus, 
  Search, 
  Package, 
  Cpu,
  QrCode,
  Edit,
  LayoutGrid,
  Activity,
  Tags,
  Key,
  Users
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { itemService, Item } from '@/services/item.service';
import { companyService } from '@/services/company.service';
import { departmentService } from '@/services/department.service';
import ItemModal from './ItemModal';
import AssetDetailsDrawer from './AssetDetailsDrawer';
import ItemTrackingModal from './ItemTrackingModal';
import EmployeeAssetsModal from './EmployeeAssetsModal';
import QrPrintModal from '@/components/qr/QrPrintModal';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';

const columnHelper = createColumnHelper<Item>();

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, any> = {
    'WAREHOUSE':      { bg: 'rgba(71, 85, 105, 0.12)', color: '#475569' },
    'IN_USE':         { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
    'IN_REPAIR':      { bg: 'rgba(217, 119, 6, 0.12)',  color: '#d97706' },
    'SENT_TO_REPAIR': { bg: 'rgba(217, 119, 6, 0.12)',  color: '#d97706' },
    'LOST':           { bg: 'rgba(225, 29, 72, 0.12)',  color: '#e11d48' },
    'DISPOSED':       { bg: 'rgba(15, 23, 42, 0.12)',   color: '#0f172a' },
    'IN_TRANSIT':     { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' },
  };
  const s = styles[status] || styles['WAREHOUSE'];
  return (
    <div style={{
      padding: '4px 12px', borderRadius: 50, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.color}22`,
      textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5,
      letterSpacing: '0.02em'
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {status ? status.replace(/_/g, ' ') : 'UNKNOWN'}
    </div>
  );
};

export default function ItemsPage() {
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<Item | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingItem, setTrackingItem] = useState<Item | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [qrPrintItem, setQrPrintItem] = useState<Item | null>(null);
  const [page, setPage] = useState(1);
  const hasPermission = useAuthStore((s: any) => s.hasPermission);
  const LIMIT = 15;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search');
  const urlOpen = searchParams.get('open');

  // Sync Search from URL
  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  /* ─── Queries ─── */
  const { data: itemData, isLoading } = useQuery({
    queryKey: ['items', search, companyFilter, deptFilter, statusFilter, page],
    queryFn: () => itemService.getItems({
      search,
      companyId: companyFilter || undefined,
      departmentId: deptFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: LIMIT,
    }),
    placeholderData: (prev) => prev,
  });

  const { data: companyData } = useQuery({ 
    queryKey: ['companies', 'active'], 
    queryFn: () => companyService.getCompanies({ limit: 100 }) 
  });

  const { data: deptData } = useQuery({ 
    queryKey: ['departments', companyFilter], 
    queryFn: () => departmentService.getDepartments(companyFilter || undefined, { limit: 100 }),
    enabled: !!companyFilter
  });

  const items = useMemo(() => Array.isArray(itemData) ? itemData : (itemData as any)?.data || [], [itemData]);
  const itemMeta = useMemo(() => (itemData as any)?.meta || { total: items.length, lastPage: 1, totalPages: 1 }, [itemData]);
  const companies = useMemo(() => Array.isArray(companyData) ? companyData : (companyData as any)?.data || [], [companyData]);
  const departments = useMemo(() => Array.isArray(deptData) ? deptData : (deptData as any)?.data || [], [deptData]);

  // Handle Deep Link 'open' or sync search
  useEffect(() => {
    if (!urlOpen && !urlSearch) return;

    const newParams = new URLSearchParams(searchParams);
    let changed = false;

    if (urlOpen) {
      const match = items.find((i: Item) => i.id === urlOpen);
      if (match) {
        setDrawerItem(match);
        setIsDrawerOpen(true);
      } else {
        // Item not in current page — fetch directly by ID (QR deep-link case)
        itemService.getItemTimeline(urlOpen).then(({ item }: { item: Item }) => {
          if (item) { setDrawerItem(item); setIsDrawerOpen(true); }
        }).catch(() => {});
      }
      newParams.delete('open');
      changed = true;
    } else if (urlSearch) {
      const match = items.find((i: Item) => i.barcode === urlSearch);
      if (match) {
        setDrawerItem(match);
        setIsDrawerOpen(true);
      }
      newParams.delete('search');
      changed = true;
    }

    if (changed) {
      setSearchParams(newParams, { replace: true });
    }
  }, [urlOpen, urlSearch, items, searchParams, setSearchParams]);

  /* ─── Columns ─── */
  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'ASSET NAME',
      cell: info => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--search-bg)',
            color: 'var(--accent-yellow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border-dark)', flexShrink: 0,
          }}>
            <Package size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 13, lineHeight: '1.2' }}>
              {info.getValue() || 'Unnamed Asset'}
            </span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('category.name', {
      header: 'CATEGORY',
      cell: info => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{info.getValue() || '-'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'STATUS',
      cell: info => <StatusBadge status={info.getValue() || 'WAREHOUSE'} />,
    }),
    columnHelper.accessor('assignedToName', {
      header: 'ASSIGNMENT',
      cell: info => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: info.getValue() ? 'var(--text-main)' : 'var(--text-muted)' }}>
            {info.getValue() || 'Unassigned'}
          </span>
          {info.row.original.department && (
            <span style={{ fontSize: 11, opacity: 0.6 }}>{info.row.original.department.name}</span>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'ACTIONS',
      cell: info => (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          <button
            title="Print / Save QR Code"
            onClick={(e) => {
              e.stopPropagation();
              setQrPrintItem(info.row.original);
            }}
            style={{ 
              background: 'rgba(255, 224, 83, 0.08)', border: '1px solid rgba(255, 224, 83, 0.15)', 
              borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#ffe053', 
              display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 224, 83, 0.15)'; e.currentTarget.style.borderColor = 'rgba(255, 224, 83, 0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 224, 83, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255, 224, 83, 0.15)'; }}
          >
            <QrCode size={16} />
          </button>
          
          {hasPermission(AdminPermission.UPDATE_ITEMS) && (
            <button 
              title="Edit Asset"
              onClick={(e) => { 
                e.stopPropagation();
                setSelectedItem(info.row.original); 
                setIsModalOpen(true); 
              }}
              style={{ 
                background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', 
                borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#8b5cf6', 
                display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'; }}
            >
              <Edit size={16} />
            </button>
          )}

          <button 
            title="Track Lifecycle"
            onClick={(e) => { 
              e.stopPropagation();
              setTrackingItem(info.row.original); 
              setIsTrackingModalOpen(true); 
            }}
            style={{ 
              background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', 
              borderRadius: 8, padding: '7px', cursor: 'pointer', color: '#10b981', 
              display: 'flex', alignItems: 'center', transition: 'all 0.2s', height: 32, width: 32, justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.15)'; }}
          >
            <Activity size={16} />
          </button>
        </div>
      ),
    }),
  ], [setDrawerItem, setIsDrawerOpen, setSelectedItem, setIsModalOpen, setTrackingItem, setIsTrackingModalOpen]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page Header */}
      <header className="items-header" style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Inventory Matrix
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            Centralized hub for tracking corporate assets and physical inventory.
          </p>
        </div>
        <div className="items-header-actions" style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setIsEmployeeModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 12, border: '1px solid var(--border-dark)', 
              background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6',
              fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer'
            }}
            className="hover-card"
          >
            <Users size={18} strokeWidth={2.5} />
            Employee Asset View
          </button>
          {hasPermission(AdminPermission.VIEW_LICENSES) && (
            <NavLink
              to="/licenses"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                borderRadius: 12, border: '1px solid var(--border-dark)', 
                background: 'rgba(16, 185, 129, 0.05)', color: '#10b981',
                fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s'
              }}
              className="hover-card"
            >
              <Key size={18} strokeWidth={2.5} />
              Manage Licenses
            </NavLink>
          )}
          {hasPermission(AdminPermission.VIEW_CATEGORIES) && (
            <NavLink
              to="/categories"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                borderRadius: 12, border: '1px solid var(--border-dark)', 
                background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-main)',
                fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s'
              }}
              className="hover-card"
            >
              <Tags size={18} strokeWidth={2.5} />
              Manage Categories
            </NavLink>
          )}
          {hasPermission(AdminPermission.CREATE_ITEMS) && (
            <button
              className="primary-btn"
              onClick={() => { setSelectedItem(null); setIsModalOpen(true); }}
            >
              <Plus size={18} strokeWidth={3} />
              Add New Asset
            </button>
          )}
        </div>
      </header>

      {/* Main Content Card */}
      <div className="dark-card" style={{ padding: '24px 0 0', overflow: 'hidden' }}>
        
        {/* Filters Toolbar */}
        <div className="filter-toolbar" style={{ padding: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          
          {/* Search Box */}
          <div className="search-box-wrapper" style={{ position: 'relative', flex: '1 1 250px', minWidth: 200 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 12 }} />
            <input
              type="text"
              placeholder="Search by name, asset code or serial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px 10px 42px',
                borderRadius: 8, border: '1px solid var(--border-dark)',
                background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13,
                outline: 'none'
              }}
            />
          </div>

          <div className="filter-group" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flex: '2 1 400px' }}>
            {/* Status Filter */}
            <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ ...styles.select, width: '100%' }}
              >
                <option value="">All Statuses</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="IN_USE">In Use</option>
                <option value="IN_REPAIR">In Repair</option>
                <option value="SENT_TO_REPAIR">Sent To Repair</option>
                <option value="LOST">Lost</option>
                <option value="DISPOSED">Disposed</option>
              </select>
            </div>

            {/* Subsidiary Filter */}
            <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
              <select 
                value={companyFilter}
                onChange={e => { setCompanyFilter(e.target.value); setDeptFilter(''); setPage(1); }}
                style={{ ...styles.select, width: '100%' }}
              >
                <option value="">All Subsidiaries</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Department Filter */}
            <div style={{ flex: 1, minWidth: 150 }}>
              <select 
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                disabled={!companyFilter}
                style={{ ...styles.select, width: '100%', opacity: !companyFilter ? 0.5 : 1 }}
              >
                <option value="">All Departments</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Assets List (Responsive) */}
        {!isMobile ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} style={{ borderBottom: '1px solid var(--border-dark)', background: 'rgba(0,0,0,0.04)' }}>
                    {hg.headers.map(header => (
                      <th
                        key={header.id}
                        style={{
                          padding: '16px 24px',
                          textAlign: header.id === 'actions' ? 'center' : 'left',
                          fontSize: 11, fontWeight: 700,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
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
                  <tr>
                    <td colSpan={5} style={{ padding: 60, textAlign: 'center' }}>
                      <div className="loading-spinner" />
                      <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>Synchronizing inventory...</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <LayoutGrid size={48} style={{ opacity: 0.1, margin: '0 auto 16px', display: 'block' }} />
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>No assets found</p>
                      <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.6 }}>Try adjusting your filters or search query</p>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id} 
                      onClick={() => {
                        setDrawerItem(row.original);
                        setIsDrawerOpen(true);
                      }}
                      style={{ borderBottom: '1px solid var(--border-dark)', cursor: 'pointer' }} 
                      className="table-row-hover"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td 
                          key={cell.id} 
                          style={{ 
                            padding: '16px 24px', 
                            fontSize: 13, 
                            color: 'var(--text-main)', 
                            verticalAlign: 'middle',
                            textAlign: cell.column.id === 'actions' ? 'center' : 'left'
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
        ) : (
          /* Mobile Card View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 24px' }}>
            {isLoading ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div className="loading-spinner" />
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                 No assets found
              </div>
            ) : (
              items.map((item: Item) => (
                <div 
                  key={item.id}
                  onClick={() => { setDrawerItem(item); setIsDrawerOpen(true); }}
                  className="premium-glass-card"
                  style={{ 
                    padding: 16, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 12,
                    border: '1px solid var(--border-dark)',
                    background: 'var(--bg-card)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ 
                        width: 40, height: 40, borderRadius: 10, 
                        background: 'var(--bg-dark)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent-yellow)', border: '1px solid var(--border-dark)'
                      }}>
                        <Package size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.barcode}</div>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 8,
                    padding: '12px 0',
                    borderTop: '1px solid var(--border-dark)',
                    borderBottom: '1px solid var(--border-dark)'
                  }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{item.category?.name || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned To</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{item.assignedToName || 'Warehouse'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                     <button
                        onClick={(e) => { e.stopPropagation(); setQrPrintItem(item); }}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                     >
                       <QrCode size={14} /> QR
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setTrackingItem(item); setIsTrackingModalOpen(true); }}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                     >
                       <Activity size={14} /> History
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Pagination */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          Showing <strong>{items.length}</strong> of <strong>{itemMeta.total}</strong> assets &nbsp;•&nbsp; Page {page} of {itemMeta.lastPage || itemMeta.totalPages || 1}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><LayoutGrid size={0} /><span style={{ fontSize: 16 }}>‹</span></button>
          <button
            onClick={() => setPage(p => Math.min(itemMeta.lastPage || itemMeta.totalPages || 1, p + 1))}
            disabled={page >= (itemMeta.lastPage || itemMeta.totalPages || 1)}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-dark)',
              background: 'var(--bg-card)', color: 'var(--text-main)',
              cursor: page >= (itemMeta.lastPage || 1) ? 'not-allowed' : 'pointer',
              opacity: page >= (itemMeta.lastPage || 1) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><span style={{ fontSize: 16 }}>›</span></button>
        </div>
      </div>

      {/* Item Modal */}
      <ItemModal 
        item={selectedItem} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Asset Details Drawer */}
      {drawerItem && (
        <AssetDetailsDrawer
          item={drawerItem}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            // Safety: Clear deep link params if they still exist
            if (searchParams.has('search') || searchParams.has('open')) {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('search');
              newParams.delete('open');
              setSearchParams(newParams, { replace: true });
            }
          }}
        />
      )}

      {/* Item Lifecycle Tracking Modal */}
      <ItemTrackingModal
        item={trackingItem}
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
      />

      {/* Employee Assets Modal */}
      <EmployeeAssetsModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
      />

      {/* QR Print Modal */}
      {qrPrintItem && (
        <QrPrintModal
          isOpen={!!qrPrintItem}
          onClose={() => setQrPrintItem(null)}
          itemId={qrPrintItem.id}
          itemName={qrPrintItem.name}
          assetCode={qrPrintItem.barcode}
        />
      )}

      <style>{`
        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(255,224,83,0.1);
          border-top: 3px solid var(--accent-yellow);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .items-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .items-header-actions {
            flex-direction: column !important;
          }
          .items-header-actions button, .items-header-actions a {
            width: 100% !important;
            justify-content: center !important;
          }
          .filter-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .filter-group {
            flex-direction: column !important;
            flex: 1 1 100% !important;
          }
          .search-box-wrapper {
            max-width: 100% !important;
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  select: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid var(--border-dark)',
    background: 'var(--search-bg)',
    color: 'var(--text-main)',
    fontSize: 13,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
  }
};
