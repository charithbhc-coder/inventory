import { Package, Network, Building2, AlertOctagon, RefreshCw, Eye, UserPlus, AlertTriangle, Wrench, PlusCircle, Search, Layers } from 'lucide-react';

// Color palette cycled for category cards
const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
  '#e879f9', '#38bdf8',
];
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics.service';
import { formatDistanceToNow } from 'date-fns';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useNotificationStore } from '@/store/notification.store';
import { queryClient } from '@/App';

import ItemModal from '../items/ItemModal';
import AssignModal from '../items/AssignModal';
import RepairModal from '../items/RepairModal';
import ReportLostModal from '../items/ReportLostModal';
import { itemService } from '@/services/item.service';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [actionFlow, setActionFlow] = useState<{ type: 'register' | 'assign' | 'repair' | 'lost' | null }>({ type: null });
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 8;
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['analytics', 'companies'],
    queryFn: () => analyticsService.getAssetsByCompany(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['analytics', 'by-category'],
    queryFn: () => analyticsService.getItemsByCategory(),
  });

  const { data: activity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['analytics', 'activity'],
    queryFn: () => analyticsService.getRecentActivity(10),
    refetchInterval: 30000, // fallback: also poll every 30s
  });

  const socket = useNotificationStore((state) => state.socket);

  // Real-time refresh listener — subscribes reactively when socket connects
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    };

    socket.on('audit_log_updated', handleUpdate);
    return () => {
      socket.off('audit_log_updated', handleUpdate);
    };
  }, [socket]);

  const totalAssets = companies.reduce((acc: number, c: any) => acc + parseInt(c.total, 10), 0);
  const needsRepair = companies.reduce((acc: number, c: any) => acc + parseInt(c.needsRepair || 0, 10), 0);
  const lost = companies.reduce((acc: number, c: any) => acc + parseInt(c.lost || 0, 10), 0);
  const inRepair = companies.reduce((acc: number, c: any) => acc + parseInt(c.inRepair || 0, 10), 0);
  const warehouse = companies.reduce((acc: number, c: any) => acc + parseInt(c.warehouse || 0, 10), 0);
  const disposed = companies.reduce((acc: number, c: any) => acc + parseInt(c.disposed || 0, 10), 0);

  const inUse = companies.reduce((acc: number, c: any) => acc + parseInt(c.inUse || 0, 10), 0);

  if (loadingCompanies || loadingActivity) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw className="spin" size={32} color="var(--accent-yellow)" />
      </div>
    );
  }

  const activeCategories = (categories as any[]).filter((c: any) => parseInt(c.total) > 0);

  return (
    <div className="dashboard-grid">
      <header className="col-span-12" style={styles.header}>
        <div>
          <h1 style={styles.title}>Global Dashboard</h1>
          <p style={styles.subtitle}>Enterprise Overview • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </header>

      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard title="TOTAL ASSETS" value={totalAssets.toLocaleString()} trend="+0.0%" icon={<Package size={24} />} />
      </div>
      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard title="IN REPAIR" value={inRepair} tag={`${needsRepair - inRepair} Pending`} icon={<Network size={24} />} />
      </div>
      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard title="COMPANIES" value={companies.length} tag="Active Entities" icon={<Building2 size={24} />} />
      </div>
      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard 
          title="MISSING ASSETS" 
          value={lost.toString().padStart(2, '0')} 
          isAlert={lost > 0}
          icon={<AlertOctagon size={24} />} 
          extra={
            lost > 0 
              ? `${lost} assets reported lost`
              : "No missing items"
          } 
        />
      </div>

      {/* Asset Health Overview — replaces Company Resource Distribution */}
      <div className="col-span-12 lg-col-span-8 dark-card">
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Asset Health Overview</h3>
            <p style={styles.cardSub}>Live status breakdown across all subsidiaries</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-dark)', padding: '4px 12px', borderRadius: 50, border: '1px solid var(--border-dark)' }}>
            {totalAssets.toLocaleString()} total assets
          </span>
        </div>

        {/* Segmented stacked bar */}
        {totalAssets > 0 && (
          <div style={{ height: 8, borderRadius: 50, overflow: 'hidden', display: 'flex', marginBottom: 20, gap: 3 }}>
            <div style={{ flex: inUse || 0, background: '#10b981', minWidth: inUse > 0 ? 4 : 0, borderRadius: '50px 0 0 50px', transition: 'flex 0.8s ease' }} />
            <div style={{ flex: warehouse || 0, background: '#3b82f6', minWidth: warehouse > 0 ? 4 : 0, transition: 'flex 0.8s ease' }} />
            <div style={{ flex: inRepair || 0, background: '#f59e0b', minWidth: inRepair > 0 ? 4 : 0, transition: 'flex 0.8s ease' }} />
            <div style={{ flex: disposed || 0, background: '#ef4444', minWidth: disposed > 0 ? 4 : 0, borderRadius: '0 50px 50px 0', transition: 'flex 0.8s ease' }} />
          </div>
        )}

        {/* 2×2 Status Health Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { label: 'In Use', count: inUse, color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.18)' },
            { label: 'In Warehouse', count: warehouse, color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.18)' },
            { label: 'In Repair', count: inRepair, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)' },
            { label: 'Disposed', count: disposed, color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.18)' },
          ].map(stat => {
            const pct = totalAssets > 0 ? Math.round((stat.count / totalAssets) * 100) : 0;
            return (
              <div key={stat.label} style={{
                padding: '16px 18px', borderRadius: 14, background: stat.bg,
                border: `1.5px solid ${stat.border}`, position: 'relative', overflow: 'hidden',
              }}>
                {/* Color accent top stripe */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stat.color, borderRadius: '14px 14px 0 0' }} />
                <div style={{ fontSize: 30, fontWeight: 900, color: stat.color, lineHeight: 1, letterSpacing: '-1px' }}>
                  {stat.count.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 5 }}>
                  {stat.label}
                </div>
                {/* Mini progress bar */}
                <div style={{ marginTop: 12, height: 4, borderRadius: 50, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: stat.color, borderRadius: 50, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: stat.color, fontWeight: 700, marginTop: 5 }}>{pct}% of fleet</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="col-span-12 lg-col-span-4 dark-card">
        <h3 style={styles.cardTitle}>Asset Lifecycle</h3>
        <p style={styles.cardSub}>Global status distribution</p>
        <div style={{ position: 'relative', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0', minHeight: 160 }}>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Active', value: inUse },
                  { name: 'In Repair', value: inRepair },
                  { name: 'Warehouse', value: warehouse },
                  { name: 'Disposed', value: disposed },
                  { name: 'Missing/Lost', value: lost },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#3b82f6" />
                <Cell fill="#ef4444" />
                <Cell fill="#991b1b" />
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 8, fontSize: 12, color: 'var(--text-main)' }} 
                itemStyle={{ color: 'var(--text-main)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={styles.donutInfo}>
            <span style={styles.donutPercent}>{totalAssets > 0 ? Math.round((inUse / totalAssets) * 100) : 0}%</span>
            <span style={styles.donutLabel}>IN USE</span>
          </div>
        </div>
        <div style={styles.donutLegend}>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: '#10b981'}}/> Active</span> <strong style={{ color: '#10b981'}}>{inUse.toLocaleString()}</strong></div>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: '#3b82f6'}}/> Warehouse</span> <strong style={{ color: '#3b82f6'}}>{warehouse.toLocaleString()}</strong></div>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: '#f59e0b'}}/> In Repair</span> <strong style={{ color: '#f59e0b'}}>{inRepair.toLocaleString()}</strong></div>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: '#ef4444'}}/> Disposed</span> <strong style={{ color: '#ef4444'}}>{disposed.toLocaleString()}</strong></div>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: '#991b1b'}}/> Missing/Lost</span> <strong style={{ color: '#991b1b'}}>{lost.toLocaleString()}</strong></div>
        </div>
      </div>

      {/* ── Category Inventory Section ── */}
      {activeCategories.length > 0 && (
        <div className="col-span-12 dark-card">
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Inventory by Category</h3>
              <p style={styles.cardSub}>Item counts across all asset categories</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-dark)', padding: '4px 12px', borderRadius: 50, border: '1px solid var(--border-dark)' }}>
              {activeCategories.length} categories
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {activeCategories.map((cat: any, idx: number) => {
              const total = parseInt(cat.total) || 0;
              const inUseCat = parseInt(cat.inUse) || 0;
              const warehouseCat = parseInt(cat.warehouse) || 0;
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              const inUsePct = total > 0 ? Math.round((inUseCat / total) * 100) : 0;
              return (
                <div
                  key={cat.categoryId}
                  onClick={() => navigate(`/items?category=${cat.categoryId}`)}
                  style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: `${color}0D`,
                    border: `1.5px solid ${color}30`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${color}20`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}30`; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '12px 12px 0 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Layers size={14} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>{cat.categoryName}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{total}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Total Items</div>
                  <div style={{ marginTop: 10, height: 4, borderRadius: 50, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${inUsePct}%`, height: '100%', background: color, borderRadius: 50, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                    <span style={{ color }}>{inUseCat} in use</span>
                    <span>{warehouseCat} stock</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="col-span-12 lg-col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div className="dark-card" style={{ padding: '24px 24px 16px', overflowX: 'auto', alignSelf: 'start', width: '100%' }}>
        <div style={{ ...styles.cardHeader, marginBottom: 16 }}>
          <h3 style={styles.cardTitle}>Global Item Overview</h3>
          <span className="view-all-link" style={styles.link} onClick={() => navigate('/items')}>View All Items</span>
        </div>
        <table style={styles.table}>
          <thead>
            <tr style={{ background: 'transparent' }}>
              <th style={styles.th}>COMPANY NAME</th>
              <th style={styles.th}>TOTAL ITEMS</th>
              <th style={styles.th}>IN USE</th>
              <th style={styles.th}>STATUS</th>
              <th style={{...styles.th, textAlign: 'center'}}>ACTION</th>
            </tr>
          </thead>
          <tbody style={{ background: 'transparent' }}>
            {companies
              .slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
              .map((c: any) => (
                <TableRow 
                  key={c.companyId}
                  company={c.companyName} 
                  category={`${c.total} Items`}
                  value={c.inUse} 
                  status={parseInt(c.needsRepair) > 0 ? 'Needs Attention' : 'Healthy'} 
                  isWarn={parseInt(c.needsRepair) > 0} 
                  onReview={() => setSelectedCompany(c)}
                />
            ))}
          </tbody>
        </table>
        {/* Pagination footer */}
        {companies.length > TABLE_PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 4px', marginTop: 8, borderTop: '1px solid var(--border-dark)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              Page {tablePage} of {Math.ceil(companies.length / TABLE_PAGE_SIZE)}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setTablePage(p => Math.max(1, p - 1))}
                disabled={tablePage <= 1}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  border: '1px solid var(--border-dark)',
                  background: 'var(--bg-card)', color: 'var(--text-main)',
                  cursor: tablePage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: tablePage <= 1 ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}
              >‹</button>
              <button
                onClick={() => setTablePage(p => Math.min(Math.ceil(companies.length / TABLE_PAGE_SIZE), p + 1))}
                disabled={tablePage >= Math.ceil(companies.length / TABLE_PAGE_SIZE)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  border: '1px solid var(--border-dark)',
                  background: 'var(--bg-card)', color: 'var(--text-main)',
                  cursor: tablePage >= Math.ceil(companies.length / TABLE_PAGE_SIZE) ? 'not-allowed' : 'pointer',
                  opacity: tablePage >= Math.ceil(companies.length / TABLE_PAGE_SIZE) ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}
              >›</button>
            </div>
          </div>
        )}
        </div>

        {/* Quick Actions Hub to fill the gap under the table (Super Admin only for overriding standard flows) */}
        {user?.role === 'SUPER_ADMIN' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
            <ActionCard title="Register Asset" icon={<PlusCircle size={22} />} color="#3b82f6" onClick={() => setActionFlow({ type: 'register' })} />
            <ActionCard title="Assign Asset" icon={<UserPlus size={22} />} color="#10b981" onClick={() => setActionFlow({ type: 'assign' })} />
            <ActionCard title="Schedule Repair" icon={<Wrench size={22} />} color="#f59e0b" onClick={() => setActionFlow({ type: 'repair' })} />
            <ActionCard title="Report Lost" icon={<AlertTriangle size={22} />} color="#ef4444" onClick={() => setActionFlow({ type: 'lost' })} />
          </div>
        )}
      </div>

      <div className="col-span-12 lg-col-span-4 dark-card">
        <h3 style={styles.cardTitle}>Recent System Activity</h3>
        <p style={styles.cardSub}>Your recent actions • <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/logs')}>View full log →</span></p>
        <div style={styles.timeline}>
          {activity.slice(0, 10).map((item: any, idx: number) => {
            const ACTION_MAP: Record<string, string> = {
              ITEM_ADDED: 'Asset Registered',
              ITEM_EDITED: 'Asset Updated',
              DISPOSED: 'Asset Disposed',
              ASSIGNED_TO_PERSON: 'Assigned to Person',
              ASSIGNED_TO_DEPARTMENT: 'Assigned to Dept',
              UNASSIGNED: 'Returned to Custody',
              SENT_TO_REPAIR: 'Repair Initiated',
              RETURNED_FROM_REPAIR: 'Returned from Repair',
              REPORT_LOST: 'Reported Missing',
              STATUS_CHANGE: 'Status Modified',
              TRANSFERRED: 'Asset Transferred',
              // Report scheduling (stored by interceptor as CREATE_SCHEDULES etc.)
              CREATE_SCHEDULED: 'Report Scheduled',
              UPDATE_SCHEDULED: 'Report Schedule Updated',
              DELETE_SCHEDULED: 'Report Schedule Deleted',
              CREATE_SEND_EMAIL: 'Report Email Dispatched',
              // Interceptor-generated variations (path-based)
              CREATE_SCHEDULES: 'Report Scheduled',
              UPDATE_SCHEDULES: 'Report Schedule Updated',
              DELETE_SCHEDULES: 'Report Schedule Deleted',
              SEND_EMAIL: 'Report Email Dispatched',
              UPDATE_SCHEDULED_REPORTS: 'Report Schedule Updated',
              CREATE_SCHEDULED_REPORTS: 'Report Scheduled',
              GENERATE_EXCEL: 'Report Exported (Excel)',
              GENERATE_PDF: 'Report Exported (PDF)',
              
              // Administrative Actions
              CREATE_CATEGORIES: 'Category Created',
              UPDATE_CATEGORIES: 'Category Updated',
              DELETE_CATEGORIES: 'Category Deleted',
              
              CREATE_COMPANIES: 'Subsidiary Created',
              UPDATE_COMPANIES: 'Subsidiary Updated',
              DELETE_COMPANIES: 'Subsidiary Deleted',
              
              CREATE_DEPARTMENTS: 'Department Created',
              UPDATE_DEPARTMENTS: 'Department Updated',
              DELETE_DEPARTMENTS: 'Department Deleted',
              
              CREATE_USERS: 'User Profile Created',
              UPDATE_USERS: 'User Profile Updated',
              DELETE_USERS: 'User Profile Deleted',
              
              CREATE_ITEMS: 'New Asset Registered',
              UPDATE_ITEMS: 'Asset Record Updated',
              DELETE_ITEMS: 'Asset Record Deleted',
            };

            const normalizedEventType = String(item.eventType || '').toUpperCase().replace(/-/g, '_');
            let title = ACTION_MAP[normalizedEventType] || normalizedEventType.replace(/_/g, ' ');
            if (item.toPersonName) {
              title = `Assigned to ${item.toPersonName}`;
            } else if (normalizedEventType === 'UNASSIGNED' && item.fromPersonName) {
              title = `Released from ${item.fromPersonName}`;
            }

            const eventDate = new Date(item.createdAt);
            // Ensure the date is treated as UTC if it's a string without a zone
            const timeString = formatDistanceToNow(eventDate, { addSuffix: true }).toUpperCase();

            return (
              <TimelineItem 
                key={idx}
                icon={normalizedEventType === 'STATUS_CHANGE' ? <RefreshCw size={12} /> : <Package size={12} />} 
                title={title} 
                desc={item.source === 'audit' 
                  ? `${item.notes || 'No description'} • By ${item.performedBy}` 
                  : `${item.itemName} - ${item.notes || 'No description'} • By ${item.performedBy}`} 
                time={timeString} 
                eventType={normalizedEventType}
              />
            );
          })}
          {activity.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent activity found.</p>}
        </div>
      </div>
      <style>{`
        html[data-theme="light"] .view-all-link {
          color: #1b475d !important;
        }
        html[data-theme="dark"] .view-all-link {
          color: var(--accent-yellow) !important;
        }
        .action-card-hover {
          transition: all 0.2s cubic-bezier(0.2,0.8,0.2,1);
        }
        .action-card-hover:hover {
          transform: translateY(-4px);
        }
      `}</style>

      {selectedCompany && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedCompany(null)}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, width: 400, border: '1px solid var(--border-dark)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text-main)', fontWeight: 800 }}>{selectedCompany.companyName} Overview</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-dark)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>Total Handled Assets</span>
                <span style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 700 }}>{selectedCompany.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-dark)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>Currently In Use</span>
                <span style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 700 }}>{selectedCompany.inUse}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-dark)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>In Warehouse</span>
                <span style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 700 }}>{selectedCompany.warehouse}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-dark)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>Currently In Repair</span>
                <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>{selectedCompany.inRepair || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-dark)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>Flagged for Repair</span>
                <span style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 700 }}>{selectedCompany.needsRepair || 0}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedCompany(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Close</button>
              <button onClick={() => navigate('/items')} style={{ background: 'var(--accent-yellow)', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>View Items</button>
            </div>
          </div>
        </div>
      )}

      {actionFlow.type && (
        <GlobalActionFlow type={actionFlow.type} onClose={() => setActionFlow({ type: null })} />
      )}
    </div>
  );
}

// Sub-components
function StatCard({ title, value, trend, tag, icon, isAlert, extra }: any) {
  return (
    <div className="dark-card stat-card" style={isAlert ? { border: '1px solid var(--accent-red)' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ 
          color: isAlert ? 'var(--accent-red)' : '#8b5cf6',
          background: isAlert ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
          padding: 8,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
        {trend && <span style={styles.trendBadge}>{trend}</span>}
        {tag && <span style={styles.tagBadge}>{tag}</span>}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: isAlert ? 'var(--accent-red)' : 'var(--text-main)', letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{title}</div>
      </div>
      {extra && (
        <div style={{ fontSize: 11, color: 'var(--accent-red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--timeline-danger-bg)', paddingTop: 10, marginTop: 4 }}>
          <span style={{...styles.dot, background: 'var(--accent-red)'}} /> {extra}
        </div>
      )}
    </div>
  );
}

function TableRow({ company, category, value, status, isWarn, onReview }: any) {
  const statusBg = isWarn ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';
  const statusColor = isWarn ? '#f59e0b' : '#10b981';

  return (
    <tr style={{ background: 'transparent' }}>
      <td style={styles.td}><strong style={{ color: 'var(--text-main)' }}>{company}</strong></td>
      <td style={styles.td}>{category}</td>
      <td style={styles.td}><strong style={{ color: 'var(--text-main)' }}>{value}</strong></td>
      <td style={styles.td}>
        <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusBg, color: statusColor, border: `1px solid ${statusColor}33` }}>
          {status}
        </span>
      </td>
      <td style={{...styles.td, textAlign: 'center'}}>
        <button onClick={onReview} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', padding: '6px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', verticalAlign: 'middle' }}>
          <Eye size={16} />
        </button>
      </td>
    </tr>
  );
}

function ActionCard({ title, icon, color, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="dark-card action-card-hover"
      style={{ 
        cursor: 'pointer', padding: '20px 16px', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center',
        border: `1px solid ${color}33`,
        background: 'var(--bg-card)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 8px 24px ${color}1A`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}33`; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ 
        width: 48, height: 48, borderRadius: 12, 
        background: `${color}1A`, color: color, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{title}</span>
    </div>
  );
}

function TimelineItem({ icon, title, desc, time, eventType }: any) {
  let bg = 'var(--bg-badge)';
  let color = 'var(--text-muted)';
  
  if (eventType === 'ITEM_ADDED') { bg = 'rgba(16,185,129,0.1)'; color = '#10b981'; }
  else if (eventType?.includes('ASSIGN') || eventType?.includes('TRANS')) { bg = 'rgba(59,130,246,0.1)'; color = '#3b82f6'; }
  else if (eventType?.includes('REPAIR')) { bg = 'rgba(245,158,11,0.1)'; color = '#f59e0b'; }
  else if (eventType === 'DISPOSED' || eventType === 'LOST_REPORTED' || eventType === 'REPORT_LOST') { bg = 'rgba(239,68,68,0.1)'; color = '#ef4444'; }
  
  return (
    <div style={styles.tlItem}>
      <div style={styles.tlLine} />
      <div style={{ ...styles.tlIcon, background: bg, color }}>{icon}</div>
      <div style={styles.tlContent}>
        <h4 style={styles.tlTitle}>{title}</h4>
        <p style={styles.tlDesc}>{desc}</p>
        <span style={styles.tlTime}>{time}</span>
      </div>
    </div>
  );
}

function GlobalActionFlow({ type, onClose }: any) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Determine which statuses to EXCLUDE per action type
  const EXCLUDED_FOR_ASSIGN   = ['DISPOSED', 'LOST', 'IN_REPAIR', 'SENT_TO_REPAIR'];
  const EXCLUDED_FOR_REPAIR   = ['DISPOSED', 'LOST', 'IN_REPAIR', 'SENT_TO_REPAIR'];
  const EXCLUDED_FOR_LOST     = ['DISPOSED', 'LOST'];

  const { data: itemsRes } = useQuery({
    queryKey: ['items-search', searchTerm],
    queryFn: () => itemService.getItems({ search: searchTerm, limit: 20 }),
    enabled: !!type && type !== 'register' && !selectedItem
  });

  const allItems: any[] = itemsRes?.data || [];
  const items = type === 'assign'
    ? allItems.filter(i => !EXCLUDED_FOR_ASSIGN.includes(i.status))
    : type === 'repair'
    ? allItems.filter(i => !EXCLUDED_FOR_REPAIR.includes(i.status))
    : type === 'lost'
    ? allItems.filter(i => !EXCLUDED_FOR_LOST.includes(i.status))
    : allItems;

  if (!type) return null;

  if (type === 'register') {
     return <ItemModal item={null} isOpen={true} onClose={onClose} />;
  }

  if (type && !selectedItem) {
     return (
       <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={onClose}>
         <div className="modal" style={{ width: '100%', maxWidth: 450, background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: 'var(--text-main)' }}>Select an Asset</h3>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                autoFocus
                placeholder="Search by name, barcode..." 
                style={{ width: '100%', padding: '12px 14px 12px 40px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 10, color: 'var(--text-main)', outline: 'none' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
               {items.map((it: any) => (
                  <div key={it.id} style={{ padding: 12, background: 'var(--bg-dark)', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-dark)', transition: 'all 0.2s' }} 
                       onClick={() => setSelectedItem(it)}
                       onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
                       onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dark)'}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{it.barcode} • <span style={{ color: it.status === 'Needs Attention' ? 'var(--accent-red)' : 'var(--text-muted)' }}>{it.status}</span></div>
                  </div>
               ))}
               {items.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '24px 12px', textAlign: 'center' }}>No eligible assets found{searchTerm ? ` for '${searchTerm}'` : ''}</div>}
            </div>
            <button onClick={onClose} style={{ marginTop: 24, width: '100%', padding: 12, background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-dark)', borderRadius: 10, cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-dark)'}>Cancel</button>
         </div>
       </div>
     );
  }

  if (type === 'assign') return <AssignModal item={selectedItem} isOpen={true} onClose={onClose} />;
  if (type === 'repair') return <RepairModal item={selectedItem} isOpen={true} onClose={onClose} />;
  if (type === 'lost') return <ReportLostModal item={selectedItem} isOpen={true} onClose={onClose} />;

  return null;
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    flexWrap: 'wrap' as const,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: '0 0 4px',
    color: 'var(--text-main)',
    letterSpacing: '-0.3px'
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    margin: 0,
    fontWeight: 500
  },
  btn: {
    background: 'var(--accent-yellow)',
    padding: '10px 20px',
    borderRadius: 50,
    color: '#000',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  trendBadge: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 50,
  },
  tagBadge: {
    background: 'var(--bg-badge)',
    color: 'var(--text-muted)',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 50,
  },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap' as const,
  },
  cardTitle: { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' },
  cardSub: { margin: 0, fontSize: 12, color: 'var(--text-muted)' },
  chartLegend: { display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 },
  chartArea: {
    height: 220,
    borderBottom: '1px solid var(--border-dark)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 30,
  },
  barGroup: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 10, height: '100%'},
  barWrap: { display: 'flex', gap: 4, alignItems: 'flex-end', height: '100%' },
  bar: { width: 24, borderRadius: '4px 4px 0 0', minHeight: 4 },
  barLabel: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 },
  donutWrap: {
    position: 'relative' as const,
    height: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '24px 0'
  },
  donutCircle: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'conic-gradient(var(--text-main) 0% 60%, var(--accent-yellow) 60% 75%, var(--text-muted) 75% 85%, var(--border-dark) 85% 100%)',
    WebkitMask: 'radial-gradient(transparent 55%, black 56%)'
  },
  donutInfo: { position: 'absolute' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  donutPercent: { fontSize: 24, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 },
  donutLabel: { fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '1px' },
  donutLegend: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  legendRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  legendDotWrap: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' },
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: 500, background: 'transparent' },
  link: { fontSize: 11, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' },
  th: { background: 'transparent', textAlign: 'left' as const, padding: '0 16px 12px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border-dark)' },
  td: { padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-hover)' },
  timeline: { display: 'flex', flexDirection: 'column' as const, gap: 0, marginTop: 24 },
  tlItem: { position: 'relative' as const, paddingLeft: 28, paddingBottom: 20 },
  tlLine: { position: 'absolute' as const, left: 11, top: 24, bottom: -4, width: 2, background: 'var(--border-dark)' },
  tlIcon: { position: 'absolute' as const, left: 0, top: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  tlContent: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  tlTitle: { margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-main)' },
  tlDesc: { margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 },
  tlTime: { fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginTop: 4 },
};
