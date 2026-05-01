import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCheck, Search, Building2, Package, QrCode, PowerOff, Activity, FileText } from 'lucide-react';
import { itemService, Item } from '@/services/item.service';
import { companyService } from '@/services/company.service';
import { departmentService } from '@/services/department.service';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';
import toast from 'react-hot-toast';
import { printAssetHandoverForm, printAssetIssuanceForm, PrintableItem, EmployeeInfo } from '@/utils/formPrinter';


import AssignModal from '@/features/items/AssignModal';
import QrPrintModal from '@/components/qr/QrPrintModal';
import ItemTrackingModal from '@/features/items/ItemTrackingModal';
import OffboardModal from './OffboardModal';
import TransferRequestModal from './TransferRequestModal';

interface EmployeeGroup {
  name: string;
  employeeId: string;
  departmentId: string;
  departmentName: string;
  companyId: string;
  companyName: string;
  items: Item[];
  isActive: boolean;
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [tab, setTab] = useState<'ACTIVE' | 'DEACTIVATED'>('ACTIVE');
  
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeGroup | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);

  // Modals state
  const [transferItem, setTransferItem] = useState<Item | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [qrPrintItem, setQrPrintItem] = useState<Item | null>(null);
  const [trackingItem, setTrackingItem] = useState<Item | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isOffboardModalOpen, setIsOffboardModalOpen] = useState(false);
  const [isTransferRequestModalOpen, setIsTransferRequestModalOpen] = useState(false);
  const [empPage, setEmpPage] = useState(1);
  const [assetPage, setAssetPage] = useState(1);
  const EMP_PER_PAGE = 20;
  const ASSET_PER_PAGE = 8;

  const { hasPermission, user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch active items (IN_USE) — separate query ensures we never miss employees due to pagination
  const { data: itemData, isLoading } = useQuery({
    queryKey: ['items', 'employees-active', companyFilter, deptFilter],
    queryFn: () => itemService.getItems({
      companyId: companyFilter || undefined,
      departmentId: deptFilter || undefined,
      status: 'IN_USE',
      limit: 5000,
    }),
  });

  // Fetch all items for deactivated detection (previousAssignedToName on WAREHOUSE items)
  const { data: allItemData } = useQuery({
    queryKey: ['items', 'employees-deact', companyFilter, deptFilter],
    queryFn: () => itemService.getItems({
      companyId: companyFilter || undefined,
      departmentId: deptFilter || undefined,
      limit: 5000,
    }),
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
  const allItems = useMemo(() => Array.isArray(allItemData) ? allItemData : (allItemData as any)?.data || [], [allItemData]);
  const companies = useMemo(() => Array.isArray(companyData) ? companyData : (companyData as any)?.data || [], [companyData]);
  const departments = useMemo(() => Array.isArray(deptData) ? deptData : (deptData as any)?.data || [], [deptData]);

  // Company branding for logos
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

  // Group items by employee
  const { activeEmployees, deactivatedEmployees } = useMemo(() => {
    const activeMap = new Map<string, EmployeeGroup>();
    const deactMap = new Map<string, EmployeeGroup>();

    // Build active map from IN_USE items
    items.forEach((item: Item) => {
      if (item.assignedToName) {
        const key = item.assignedToName.toLowerCase().trim();
        if (!activeMap.has(key)) {
          activeMap.set(key, {
            name: item.assignedToName,
            employeeId: item.assignedToEmployeeId || '',
            departmentId: item.departmentId || '',
            departmentName: item.department?.name || 'Unknown Dept',
            companyId: item.companyId || '',
            companyName: item.company?.name || 'Unknown Company',
            items: [],
            isActive: true
          });
        }
        activeMap.get(key)!.items.push(item);
      }
    });

    // Build deactivated map from ALL items via previousAssignedToName
    allItems.forEach((item: Item) => {
      const pastName = (item as any).previousAssignedToName;
      if (pastName && !item.assignedToName) {
        const key = pastName.toLowerCase().trim();
        // Only add to deactivated if NOT currently active
        if (!activeMap.has(key)) {
          if (!deactMap.has(key)) {
            deactMap.set(key, {
              name: pastName,
              employeeId: (item as any).previousAssignedToEmployeeId || '',
              departmentId: item.departmentId || '',
              departmentName: item.department?.name || '-',
              companyId: item.companyId || '',
              companyName: item.company?.name || '-',
              items: [],
              isActive: false
            });
          }
          deactMap.get(key)!.items.push(item);
        }
      }
    });

    // Safety: remove from deactMap anyone who also appears in activeMap
    for (const key of activeMap.keys()) deactMap.delete(key);

    const sortAlpha = (a: EmployeeGroup, b: EmployeeGroup) => a.name.localeCompare(b.name);

    return {
      activeEmployees: Array.from(activeMap.values()).sort(sortAlpha),
      deactivatedEmployees: Array.from(deactMap.values()).sort(sortAlpha)
    };
  }, [items, allItems]);

  // Apply search
  const currentList = tab === 'ACTIVE' ? activeEmployees : deactivatedEmployees;
  const filteredEmployees = currentList.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const s = status === 'IN_USE' ? { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' } : { bg: 'rgba(71, 85, 105, 0.12)', color: '#475569' };
    return (
      <div style={{ padding: '4px 8px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, textTransform: 'uppercase' }}>
        {status.replace(/_/g, ' ')}
      </div>
    );
  };

  // Helper: build employee/item objects for form printing
  const buildPrintData = (emp: EmployeeGroup, itemsToPrint: Item[]): [EmployeeInfo, PrintableItem[]] => {
    const companyObj = companies.find((c: any) => c.id === emp.companyId);
    const employeeInfo: EmployeeInfo = {
      name: emp.name,
      employeeId: emp.employeeId || '',
      department: emp.departmentName,
      company: emp.companyName,
      companyLogoUrl: companyObj?.logoUrl || undefined,
      mainCompanyLogoUrl,
    };
    const printableItems: PrintableItem[] = itemsToPrint.map(item => ({
      name: item.name,
      barcode: item.barcode,
      serialNumber: item.serialNumber || undefined,
      condition: item.condition,
      category: item.category?.name,
      remarks: item.remarks || undefined,
    }));
    return [employeeInfo, printableItems];
  };

  const handlePrintIssuance = async (emp: EmployeeGroup) => {
    if (!emp.items.length) { toast.error('No assets to print.'); return; }
    const [empInfo, printItems] = buildPrintData(emp, emp.items);
    toast.loading('Preparing issuance form...', { id: 'print' });
    await printAssetIssuanceForm(empInfo, printItems);
    toast.dismiss('print');
  };

  const handlePrintHandover = async (emp: EmployeeGroup, overrideItems?: Item[]) => {
    const itemsToPrint = overrideItems ?? emp.items;
    if (!itemsToPrint.length) { toast.error('No assets to include in handover form.'); return; }
    const [empInfo, printItems] = buildPrintData(emp, itemsToPrint);
    toast.loading('Preparing handover form...', { id: 'print' });
    await printAssetHandoverForm(empInfo, printItems);
    toast.dismiss('print');
  };

  const handleTransferClick = (item: Item) => {
    if (isSuperAdmin) {
      setTransferItem(item);
      setIsAssignModalOpen(true);
    } else {
      if (hasPermission(AdminPermission.REQUEST_TRANSFERS)) {
         setTransferItem(item);
         setIsTransferRequestModalOpen(true);
      } else {
         toast.error("You don't have permission to transfer items.");
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 40 }}>
      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          Employee Directory
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
          Manage employee assets, transfers, and offboarding.
        </p>
      </header>

      {/* Main Layout */}
      <div className="dark-card" style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '75vh', padding: 0 }}>
        
        {/* LEFT PANEL - Employee List */}
        <div style={{ 
          width: isMobile ? '100%' : 380, 
          borderRight: isMobile ? 'none' : '1px solid var(--border-dark)', 
          display: isMobile && showDetailOnMobile ? 'none' : 'flex',
          flexDirection: 'column',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {/* List Toolbar */}
          <div style={{ padding: 20, borderBottom: '1px solid var(--border-dark)' }}>
             <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 12 }} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 13, outline: 'none' }}
                />
             </div>
             <div style={{ display: 'flex', gap: 8 }}>
               <select value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setDeptFilter(''); }} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12, outline: 'none' }}>
                 <option value="">All Companies</option>
                 {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} disabled={!companyFilter} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12, outline: 'none', opacity: !companyFilter ? 0.5 : 1 }}>
                 <option value="">All Depts</option>
                 {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
               </select>
             </div>
             
             {/* Tabs */}
             <div style={{ display: 'flex', marginTop: 16, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border-dark)' }}>
                <button onClick={() => setTab('ACTIVE')} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: tab === 'ACTIVE' ? 'var(--bg-dark)' : 'transparent', color: tab === 'ACTIVE' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                   Active ({activeEmployees.length})
                </button>
                <button onClick={() => setTab('DEACTIVATED')} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: tab === 'DEACTIVATED' ? 'var(--bg-dark)' : 'transparent', color: tab === 'DEACTIVATED' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                   Deactivated ({deactivatedEmployees.length})
                </button>
             </div>
          </div>

          {/* List Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
             {isLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
             ) : filteredEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No employees found</div>
             ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pagedEmployees.map(emp => (
                     <button
                       key={emp.name}
                       onClick={() => { setSelectedEmployee(emp); setAssetPage(1); if (isMobile) setShowDetailOnMobile(true); }}
                       style={{ 
                         display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, border: '1px solid',
                         borderColor: selectedEmployee?.name === emp.name ? 'var(--accent-yellow)' : 'var(--border-dark)',
                         background: selectedEmployee?.name === emp.name ? 'rgba(255, 224, 83, 0.05)' : 'var(--bg-card)',
                         cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                       }}
                       className="hover-card"
                     >
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                           {emp.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                           <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                           <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.employeeId || 'No ID'} • {emp.departmentName}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8 }}>
                           <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-yellow)' }}>{emp.items.length}</span>
                           <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>ITEMS</span>
                        </div>
                     </button>
                  ))}
                </div>
             )}
             
             {/* Employee Pagination */}
             {totalEmpPages > 1 && (
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 8px' }}>
                 <button disabled={empPage === 1} onClick={() => setEmpPage(p => p - 1)} style={{ padding: '6px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: empPage === 1 ? 'var(--text-muted)' : 'var(--text-main)', borderRadius: 6, cursor: empPage === 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>Prev</button>
                 <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Page {empPage} of {totalEmpPages}</span>
                 <button disabled={empPage === totalEmpPages} onClick={() => setEmpPage(p => p + 1)} style={{ padding: '6px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: empPage === totalEmpPages ? 'var(--text-muted)' : 'var(--text-main)', borderRadius: 6, cursor: empPage === totalEmpPages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>Next</button>
               </div>
             )}
          </div>
        </div>

        {/* RIGHT PANEL - Employee Details */}
        <div style={{ 
          flex: 1, 
          display: (!isMobile || showDetailOnMobile) ? 'flex' : 'none',
          flexDirection: 'column',
          background: 'var(--bg-card)'
        }}>
          {selectedEmployee ? (
            <>
               {/* Detail Header */}
               <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     {isMobile && (
                        <button onClick={() => setShowDetailOnMobile(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 24, cursor: 'pointer', marginRight: 8 }}>‹</button>
                     )}
                     <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>
                        {selectedEmployee.name.charAt(0)}
                     </div>
                     <div>
                        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>{selectedEmployee.name}</h2>
                        <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><UserCheck size={14}/> {selectedEmployee.employeeId || 'No ID'}</span>
                           <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={14}/> {selectedEmployee.departmentName}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                     {/* Active: print issuance + offboard */}
                     {selectedEmployee.isActive && (
                       <button 
                         className="hover-card"
                         onClick={() => handlePrintIssuance(selectedEmployee)}
                         style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                       >
                         <FileText size={14}/> Print Issuance
                       </button>
                     )}
                     {/* Both active & deactivated: print handover */}
                     <button 
                       className="hover-card"
                       onClick={() => handlePrintHandover(selectedEmployee)}
                       style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                     >
                       <FileText size={14}/> Print Handover
                     </button>
                     {/* Active: bulk offboard */}
                     {hasPermission(AdminPermission.MANAGE_EMPLOYEES) && selectedEmployee.isActive && (
                        <button 
                           onClick={() => setIsOffboardModalOpen(true)}
                           style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(225, 29, 72, 0.3)', background: 'rgba(225, 29, 72, 0.05)', color: '#e11d48', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                           <PowerOff size={14} /> Offboard & Return All
                        </button>
                     )}
                     {/* Deactivated: re-activate (Super Admin only) */}
                     {!selectedEmployee.isActive && isSuperAdmin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: 'rgba(71,85,105,0.1)', border: '1px solid var(--border-dark)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>
                           <PowerOff size={13}/> Deactivated
                        </div>
                     )}
                  </div>
               </div>

               {/* Detail Content (Assets Table) */}
               <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                        {selectedEmployee.isActive ? 'Currently Assigned Assets' : 'Previously Held Assets (History)'}
                     </h3>
                     {!selectedEmployee.isActive && selectedEmployee.items.length > 0 && (
                       <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                         These are assets this employee <strong>previously held</strong>. They are now returned.
                       </div>
                     )}
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid var(--border-dark)', overflow: 'hidden' }}>
                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                           <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-dark)' }}>
                              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asset</th>
                              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</th>
                              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                           </tr>
                        </thead>
                        <tbody>
                           {pagedAssets.map(item => (
                              <tr key={item.id} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                                 <td style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                       <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-yellow)' }}><Package size={16}/></div>
                                       <div>
                                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.barcode}</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-main)' }}>{item.category?.name || '-'}</td>
                                 <td style={{ padding: '16px 20px' }}><StatusBadge status={item.status} /></td>
                                 <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                       <button className="hover-card" onClick={() => setQrPrintItem(item)} title="Print QR" style={{ padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#eab308', cursor: 'pointer' }}><QrCode size={14}/></button>
                                       <button className="hover-card" onClick={() => { setTrackingItem(item); setIsTrackingModalOpen(true); }} title="Asset Journey" style={{ padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#3b82f6', cursor: 'pointer' }}><Activity size={14}/></button>
                                       {selectedEmployee.isActive && (
                                          <button 
                                             onClick={() => handleTransferClick(item)}
                                             className="hover-card"
                                             style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                          >
                                             {isSuperAdmin ? 'Transfer' : 'Request Transfer'}
                                          </button>
                                       )}
                                       {!selectedEmployee.isActive && (
                                          <span style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(71,85,105,0.1)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>Returned</span>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Asset Pagination */}
                  {totalAssetPages > 1 && (
                     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
                        <button disabled={assetPage === 1} onClick={() => setAssetPage(p => p - 1)} style={{ padding: '6px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: assetPage === 1 ? 'var(--text-muted)' : 'var(--text-main)', borderRadius: 6, cursor: assetPage === 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>Prev</button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Page {assetPage} of {totalAssetPages}</span>
                        <button disabled={assetPage === totalAssetPages} onClick={() => setAssetPage(p => p + 1)} style={{ padding: '6px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', color: assetPage === totalAssetPages ? 'var(--text-muted)' : 'var(--text-main)', borderRadius: 6, cursor: assetPage === totalAssetPages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>Next</button>
                     </div>
                  )}
               </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
               <UserCheck size={64} style={{ opacity: 0.1, marginBottom: 16 }} />
               <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>Select an Employee</p>
               <p style={{ margin: '4px 0 0', fontSize: 13 }}>Choose an employee from the list to view their assets</p>
            </div>
          )}
        </div>
      </div>

      {/* Reused Modals */}
      {transferItem && (
         <AssignModal
           item={transferItem}
           isOpen={isAssignModalOpen}
           onClose={() => { setIsAssignModalOpen(false); setTransferItem(null); }}
           modalTitle="Transfer Asset"
         />
      )}
      
      {transferItem && isTransferRequestModalOpen && (
         <TransferRequestModal
           item={transferItem}
           isOpen={isTransferRequestModalOpen}
           onClose={() => { setIsTransferRequestModalOpen(false); setTransferItem(null); }}
         />
      )}
      
      {qrPrintItem && (
         <QrPrintModal
           isOpen={!!qrPrintItem}
           onClose={() => setQrPrintItem(null)}
           itemId={qrPrintItem.id}
           itemName={qrPrintItem.name}
           assetCode={qrPrintItem.barcode}
         />
      )}

      {trackingItem && (
         <ItemTrackingModal
           item={trackingItem}
           isOpen={isTrackingModalOpen}
           onClose={() => { setIsTrackingModalOpen(false); setTrackingItem(null); }}
         />
      )}

      {selectedEmployee && isOffboardModalOpen && (
         <OffboardModal
           isOpen={isOffboardModalOpen}
           onClose={() => setIsOffboardModalOpen(false)}
           employeeName={selectedEmployee.name}
           items={selectedEmployee.items}
           onPrintHandover={() => handlePrintHandover(selectedEmployee)}
         />
      )}
    </div>
  );
}
