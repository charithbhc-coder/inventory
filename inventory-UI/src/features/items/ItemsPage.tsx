import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  FileText,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { itemService, Item } from '@/services/item.service';
import { companyService } from '@/services/company.service';
import { departmentService } from '@/services/department.service';
import { categoryService } from '@/services/category.service';
import ItemModal from './ItemModal';
import AssetDetailsDrawer from './AssetDetailsDrawer';
import ItemTrackingModal from './ItemTrackingModal';

import QrPrintModal from '@/components/qr/QrPrintModal';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';
import { printGatePassForm } from '@/utils/formPrinter';
import gatePassService, { GatePass } from '@/services/gatePass.service';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewTab, setViewTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<Item | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingItem, setTrackingItem] = useState<Item | null>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [gatePassMode, setGatePassMode] = useState<'new' | 'append'>('new');
  const [selectedGatePassId, setSelectedGatePassId] = useState('');
  const [isActiveGatePassesOpen, setIsActiveGatePassesOpen] = useState(false);
  const [gatePassDetails, setGatePassDetails] = useState({
    destination: '',
    reason: '',
    authorizedBy: '',
  });
  const queryClient = useQueryClient();

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
  const urlCategory = searchParams.get('category');

  // Sync Search from URL
  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
    if (urlCategory) {
      setCategoryFilter(urlCategory);
    }
  }, [urlSearch, urlCategory]);

  const effectiveStatusFilter = useMemo(() => {
    if (viewTab === 'ARCHIVED') return 'LOST,DISPOSED';
    return statusFilter;
  }, [viewTab, statusFilter]);

  /* ─── Queries ─── */
  const { data: itemData, isLoading } = useQuery({
    queryKey: ['items', search, companyFilter, deptFilter, categoryFilter, effectiveStatusFilter, page],
    queryFn: () => itemService.getItems({
      search,
      companyId: companyFilter || undefined,
      departmentId: deptFilter || undefined,
      categoryId: categoryFilter || undefined,
      status: effectiveStatusFilter || undefined,
      page,
      limit: LIMIT,
    }),
    placeholderData: (prev) => prev,
  });

  const { data: companyData } = useQuery({ 
    queryKey: ['companies', 'active'], 
    queryFn: () => companyService.getCompanies({ limit: 100 }) 
  });

  const { data: brandingData } = useQuery({
    queryKey: ['companies-branding'],
    queryFn: () => companyService.getBranding(),
    staleTime: 0,
  });

  const mainCompanyLogoUrl = useMemo(() => {
    const all = brandingData || [];
    const ktmg = all.find((c: any) =>
      c.code?.toUpperCase() === 'KTMG' ||
      c.name?.toLowerCase().includes('kids and teens')
    );
    return ktmg?.logoUrl || undefined;
  }, [brandingData]);

  const { data: deptData } = useQuery({ 
    queryKey: ['departments', companyFilter], 
    queryFn: () => departmentService.getDepartments(companyFilter || undefined, { limit: 100 }),
    enabled: !!companyFilter
  });
  
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({ limit: 100 })
  });

  const { data: activeGatePasses = [] } = useQuery({
    queryKey: ['gate-passes', 'active'],
    queryFn: () => gatePassService.getActive(),
  });

  const items = useMemo(() => Array.isArray(itemData) ? itemData : (itemData as any)?.data || [], [itemData]);
  const itemMeta = useMemo(() => (itemData as any)?.meta || { total: items.length, lastPage: 1, totalPages: 1 }, [itemData]);
  const companies = useMemo(() => Array.isArray(companyData) ? companyData : (companyData as any)?.data || [], [companyData]);
  const departments = useMemo(() => Array.isArray(deptData) ? deptData : (deptData as any)?.data || [], [deptData]);
  const categories = useMemo(() => Array.isArray(catData) ? catData : (catData as any)?.data || [], [catData]);

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
    {
      id: 'select',
      header: ({ table }: any) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          style={{ cursor: 'pointer', width: 16, height: 16 }}
        />
      ),
      cell: ({ row }: any) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          style={{ cursor: 'pointer', width: 16, height: 16 }}
        />
      ),
    },
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
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedItems = selectedRows.map(r => r.original);

  const handleGenerateGatePass = () => {
    const invalidItems = selectedItems.filter(item => item.status !== 'WAREHOUSE');
    if (invalidItems.length > 0) {
      toast.error(`${invalidItems.length} selected item(s) are not in WAREHOUSE status. Only warehouse items can be sent via Gate Pass.`);
      return;
    }
    setGatePassMode('new');
    setSelectedGatePassId('');
    setGatePassDetails({ destination: '', reason: '', authorizedBy: '' });
    setIsGatePassModalOpen(true);
  };

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
          {/* Active Gate Passes Tracker Button */}
          <button
            onClick={() => setIsActiveGatePassesOpen(true)}
            className="hover-card"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', 
              background: 'rgba(99,102,241,0.07)', color: '#6366f1',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
            }}
          >
            <Clock size={18} strokeWidth={2.5} />
            Gate Passes
            {(activeGatePasses as GatePass[]).length > 0 && (
              <span style={{ background: '#6366f1', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                {(activeGatePasses as GatePass[]).length}
              </span>
            )}
          </button>

          {selectedItems.length > 0 && (
            <button
              onClick={handleGenerateGatePass}
              className="hover-card"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.3)', 
                background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', animation: 'slideUp 0.3s ease-out'
              }}
            >
              <FileText size={18} strokeWidth={2.5} />
              Gate Pass ({selectedItems.length})
            </button>
          )}

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
        
        {/* View Tabs */}
        <div style={{ display: 'flex', padding: '0 24px', marginBottom: 20, gap: 12 }}>
          <button 
            onClick={() => { setViewTab('ACTIVE'); setPage(1); setStatusFilter(''); }}
            style={{
              padding: '10px 24px', borderRadius: '12px', fontSize: 13, fontWeight: 800,
              background: viewTab === 'ACTIVE' ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.03)',
              color: viewTab === 'ACTIVE' ? '#000' : 'var(--text-muted)',
              border: viewTab === 'ACTIVE' ? 'none' : '1px solid var(--border-dark)',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Package size={16} />
            Inventory Matrix
          </button>
          <button 
            onClick={() => { setViewTab('ARCHIVED'); setPage(1); setStatusFilter(''); }}
            style={{
              padding: '10px 24px', borderRadius: '12px', fontSize: 13, fontWeight: 800,
              background: viewTab === 'ARCHIVED' ? '#e11d48' : 'rgba(255,255,255,0.03)',
              color: viewTab === 'ARCHIVED' ? '#fff' : 'var(--text-muted)',
              border: viewTab === 'ARCHIVED' ? 'none' : '1px solid var(--border-dark)',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Activity size={16} />
            Lost & Disposed Assets
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="filter-toolbar" style={{ padding: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search Box */}
          <div className="search-box-wrapper" style={{ position: 'relative', flex: '1 1 250px', minWidth: 200 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 12 }} />
            <input
              type="text"
              placeholder="Search by name, asset code or serial..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '10px 16px 10px 42px',
                borderRadius: 8, border: '1px solid var(--border-dark)',
                background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 13,
                outline: 'none'
              }}
            />
          </div>

          <div className="filter-group" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flex: '2 1 400px' }}>
            {/* Status Filter - Only shown in ACTIVE tab */}
            {viewTab === 'ACTIVE' && (
              <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ ...styles.select, width: '100%' }}
                >
                  <option value="">All Active Statuses</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="IN_USE">In Use</option>
                  <option value="IN_REPAIR">In Repair</option>
                  <option value="SENT_TO_REPAIR">Sent to Repair</option>
                  <option value="IN_TRANSIT">In Transit</option>
                </select>
              </div>
            )}

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

            {/* Category Filter */}
            <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
              <select 
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                style={{ ...styles.select, width: '100%' }}
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {/* Gate Pass Modal */}
      {isGatePassModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div className="modal" style={{ width: '100%', maxWidth: 500, background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-dark)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Gate Pass</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{selectedItems.length} item(s) selected</p>
                </div>
              </div>
              <button onClick={() => setIsGatePassModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            {/* Mode Toggle */}
            <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
              <button
                onClick={() => setGatePassMode('new')}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: gatePassMode === 'new' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: gatePassMode === 'new' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}
              >
                Create New Gate Pass
              </button>
              <button
                onClick={() => setGatePassMode('append')}
                disabled={(activeGatePasses as GatePass[]).length === 0}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: gatePassMode === 'append' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: gatePassMode === 'append' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s', opacity: (activeGatePasses as GatePass[]).length === 0 ? 0.4 : 1 }}
              >
                Add to Existing ({(activeGatePasses as GatePass[]).length} active)
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {gatePassMode === 'append' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Active Gate Pass</label>
                    <select
                      value={selectedGatePassId}
                      onChange={e => setSelectedGatePassId(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Select a Gate Pass...</option>
                      {(activeGatePasses as GatePass[]).map((gp) => (
                        <option key={gp.id} value={gp.id}>{gp.referenceNo} — {gp.destination} ({gp.items.length} items)</option>
                      ))}
                    </select>
                    {selectedGatePassId && (
                      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: '#6366f1' }}>
                        <strong>Note:</strong> These {selectedItems.length} item(s) will be appended to the selected Gate Pass and marked as IN_TRANSIT. The Gate Pass will be reprinted with all items.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination Subsidiary / Location</label>
                      <select
                        value={gatePassDetails.destination}
                        onChange={e => setGatePassDetails({...gatePassDetails, destination: e.target.value})}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="">Select a Destination...</option>
                        {companies.map((c: any) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason for Transfer</label>
                      <input type="text" placeholder="e.g. Sent for repair, Reallocation" value={gatePassDetails.reason}
                        onChange={e => setGatePassDetails({...gatePassDetails, reason: e.target.value})}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authorized By</label>
                      <input type="text" placeholder="e.g. IT Manager" value={gatePassDetails.authorizedBy}
                        onChange={e => setGatePassDetails({...gatePassDetails, authorizedBy: e.target.value})}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-dark)', display: 'flex', gap: 12, background: 'rgba(255,255,255,0.02)' }}>
              <button onClick={() => setIsGatePassModalOpen(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={gatePassMode === 'new' ? (!gatePassDetails.destination || !gatePassDetails.reason) : !selectedGatePassId}
                onClick={async () => {
                  toast.loading('Processing Gate Pass...', { id: 'gatepass' });
                  try {
                    let gatePassRecord: GatePass;
                    const itemIds = selectedItems.map(i => i.id);

                    if (gatePassMode === 'new') {
                      gatePassRecord = await gatePassService.create({ itemIds, ...gatePassDetails });
                    } else {
                      gatePassRecord = await gatePassService.append(selectedGatePassId, itemIds);
                    }

                    // Print the gate pass PDF
                    const companyId = selectedItems[0]?.companyId;
                    const company = companies.find((c: any) => c.id === companyId);
                    const itemsToPrint = gatePassRecord.items.map(i => ({
                      name: i.name, barcode: i.barcode, serialNumber: undefined, category: undefined, condition: undefined
                    }));
                    await printGatePassForm(
                      { name: company?.name || 'Company', logoUrl: (company as any)?.logoUrl, mainCompanyLogoUrl },
                      itemsToPrint,
                      { destination: gatePassRecord.destination, reason: gatePassRecord.reason, authorizedBy: gatePassRecord.authorizedBy }
                    );

                    toast.success(`Gate Pass ${gatePassRecord.referenceNo} issued! Items marked IN_TRANSIT.`, { id: 'gatepass' });
                    queryClient.invalidateQueries({ queryKey: ['items'] });
                    queryClient.invalidateQueries({ queryKey: ['gate-passes', 'active'] });
                    setIsGatePassModalOpen(false);
                    setRowSelection({});
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || 'Failed to process Gate Pass', { id: 'gatepass' });
                  }
                }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: gatePassMode === 'new' ? '#3b82f6' : '#6366f1', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (gatePassMode === 'new' ? (!gatePassDetails.destination || !gatePassDetails.reason) : !selectedGatePassId) ? 0.5 : 1 }}
              >
                {gatePassMode === 'new' ? '✓ Issue & Print Gate Pass' : '+ Append & Reprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Gate Passes Tracker Panel */}
      {isActiveGatePassesOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 680, background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-dark)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={20} color="#6366f1" />
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Active Gate Passes</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{(activeGatePasses as GatePass[]).length} open gate pass(es)</p>
                </div>
              </div>
              <button onClick={() => setIsActiveGatePassesOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(activeGatePasses as GatePass[]).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p>No active gate passes. All items are accounted for.</p>
                </div>
              ) : (
                (activeGatePasses as GatePass[]).map((gp) => (
                  <div key={gp.id} style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border-dark)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#6366f1' }}>{gp.referenceNo}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700 }}>IN TRANSIT</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>→ {gp.destination} &nbsp;|&nbsp; {gp.items.length} item(s) &nbsp;|&nbsp; {new Date(gp.createdAt).toLocaleDateString()}</p>
                        {gp.reason && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Reason: {gp.reason}</p>}
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(`Mark Gate Pass ${gp.referenceNo} as RETURNED? This will move all ${gp.items.length} item(s) back to WAREHOUSE.`)) return;
                          toast.loading('Marking as returned...', { id: 'gp-return' });
                          try {
                            await gatePassService.markReturned(gp.id);
                            toast.success(`${gp.referenceNo} marked as returned. Items back in WAREHOUSE.`, { id: 'gp-return' });
                            queryClient.invalidateQueries({ queryKey: ['items'] });
                            queryClient.invalidateQueries({ queryKey: ['gate-passes', 'active'] });
                          } catch {
                            toast.error('Failed to mark as returned', { id: 'gp-return' });
                          }
                        }}
                        style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✓ Mark Returned
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {gp.items.map(item => (
                        <span key={item.id} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontFamily: 'monospace' }}>{item.barcode}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
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
