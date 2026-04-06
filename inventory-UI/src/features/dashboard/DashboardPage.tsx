import { Plus, Package, Network, Building2, AlertOctagon, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics.service';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['analytics', 'companies'],
    queryFn: () => analyticsService.getAssetsByCompany(),
  });

  const { data: activity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['analytics', 'activity'],
    queryFn: () => analyticsService.getRecentActivity(10),
  });

  const totalAssets = companies.reduce((acc: number, c: any) => acc + parseInt(c.total, 10), 0);
  const needsRepair = companies.reduce((acc: number, c: any) => acc + parseInt(c.needsRepair, 10), 0);
  const inRepair = companies.reduce((acc: number, c: any) => acc + parseInt(c.inRepair, 10), 0);
  const warehouse = companies.reduce((acc: number, c: any) => acc + parseInt(c.warehouse, 10), 0);
  const disposed = companies.reduce((acc: number, c: any) => acc + parseInt(c.disposed, 10), 0);

  if (loadingCompanies || loadingActivity) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw className="spin" size={32} color="var(--accent-yellow)" />
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <header className="col-span-12" style={styles.header}>
        <div>
          <h1 style={styles.title}>Global Dashboard</h1>
          <p style={styles.subtitle}>Enterprise Overview • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button style={styles.btn}>
          <Plus size={18} strokeWidth={3} />
          Generate Global Report
        </button>
      </header>

      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard title="TOTAL ASSETS" value={totalAssets.toLocaleString()} trend="+0.0%" icon={<Package size={24} />} />
      </div>
      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard title="IN REPAIR" value={inRepair} tag={`${needsRepair} Pending`} icon={<Network size={24} />} />
      </div>
      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard title="COMPANIES" value={companies.length} tag="Active Entities" icon={<Building2 size={24} />} />
      </div>
      <div className="col-span-12 md-col-span-6 lg-col-span-3">
        <StatCard 
          title="ACTIVE ALERTS" 
          value={needsRepair.toString().padStart(2, '0')} 
          isAlert={needsRepair > 0}
          icon={<AlertOctagon size={24} color={needsRepair > 0 ? "var(--accent-red)" : "var(--text-muted)"} />} 
          extra={needsRepair > 0 ? `${needsRepair} items require immediate attention` : "All systems normal"} 
        />
      </div>

      {/* Charts Row */}
      <div className="col-span-12 lg-col-span-8 dark-card">
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Company Resource Distribution</h3>
            <p style={styles.cardSub}>Asset allocation by entity</p>
          </div>
          <div style={styles.chartLegend}>
            <span><span style={{...styles.dot, background: 'var(--text-muted)'}} /> In Use</span>
            <span><span style={{...styles.dot, background: 'var(--accent-yellow)'}} /> Warehouse</span>
          </div>
        </div>
        <div style={styles.chartArea}>
          {companies.slice(0, 4).map((c: any) => (
            <div key={c.companyId} style={styles.barGroup}>
              <div style={styles.barWrap}>
                <div style={{...styles.bar, background: 'var(--text-muted)', height: `${Math.min(100, (c.inUse / (c.total || 1)) * 100)}%`}} />
                <div style={{...styles.bar, background: 'var(--accent-yellow)', height: `${Math.min(100, (c.warehouse / (c.total || 1)) * 100)}%`}} />
              </div>
              <span style={styles.barLabel}>{c.companyName.split(' ')[0]}</span>
            </div>
          ))}
          {companies.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No data available</p>}
        </div>
      </div>

      <div className="col-span-12 lg-col-span-4 dark-card">
        <h3 style={styles.cardTitle}>Asset Lifecycle</h3>
        <p style={styles.cardSub}>Global status distribution</p>
        <div style={styles.donutWrap}>
          <div style={{
            ...styles.donutCircle,
            background: `conic-gradient(var(--text-main) 0% 64%, var(--accent-yellow) 64% 76%, var(--text-muted) 76% 84%, var(--border-dark) 84% 100%)`
          }} />
          <div style={styles.donutInfo}>
            <span style={styles.donutPercent}>{totalAssets > 0 ? Math.round(((totalAssets - disposed) / totalAssets) * 100) : 0}%</span>
            <span style={styles.donutLabel}>UTILIZATION</span>
          </div>
        </div>
        <div style={styles.donutLegend}>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: 'var(--text-main)'}}/> Active</span> <strong style={{ color: 'var(--text-main)'}}>{(totalAssets - disposed - inRepair - warehouse).toLocaleString()}</strong></div>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: 'var(--accent-yellow)'}}/> In Repair</span> <strong style={{ color: 'var(--text-main)'}}>{inRepair.toLocaleString()}</strong></div>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: 'var(--text-muted)'}}/> Warehouse</span> <strong style={{ color: 'var(--text-main)'}}>{warehouse.toLocaleString()}</strong></div>
          <div style={styles.legendRow}><span style={styles.legendDotWrap}><span style={{...styles.dot, background: 'var(--border-dark)'}}/> Disposed</span> <strong style={{ color: 'var(--text-main)'}}>{disposed.toLocaleString()}</strong></div>
        </div>
      </div>

      <div className="col-span-12 lg-col-span-8 dark-card" style={{ padding: '24px 24px 16px', overflowX: 'auto' }}>
        <div style={{ ...styles.cardHeader, marginBottom: 16 }}>
          <h3 style={styles.cardTitle}>Global Item Overview</h3>
          <span style={styles.link}>View All Items</span>
        </div>
        <table style={styles.table}>
          <thead>
            <tr style={{ background: 'transparent' }}>
              <th style={styles.th}>COMPANY NAME</th>
              <th style={styles.th}>TOTAL ITEMS</th>
              <th style={styles.th}>IN USE</th>
              <th style={styles.th}>STATUS</th>
              <th style={styles.th}>ACTION</th>
            </tr>
          </thead>
          <tbody style={{ background: 'transparent' }}>
            {companies.map((c: any) => (
              <TableRow 
                key={c.companyId}
                company={c.companyName} 
                category={`${c.total} Items`}
                value={c.inUse} 
                status={parseInt(c.needsRepair) > 0 ? 'Needs Attention' : 'Healthy'} 
                isWarn={parseInt(c.needsRepair) > 0} 
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="col-span-12 lg-col-span-4 dark-card">
        <h3 style={styles.cardTitle}>Recent System Activity</h3>
        <p style={styles.cardSub}>Audit Logs</p>
        <div style={styles.timeline}>
          {activity.map((item: any, idx: number) => (
            <TimelineItem 
              key={idx}
              icon={item.eventType === 'STATUS_CHANGE' ? <RefreshCw size={12} /> : <Package size={12} />} 
              title={item.eventType.replace('_', ' ')} 
              desc={`${item.itemName} - ${item.notes || 'No description'}`} 
              time={formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }).toUpperCase()} 
              isWarn={item.eventType === 'REPAIR_REQUESTED'}
              isDanger={item.eventType === 'REPORT_LOST'}
            />
          ))}
          {activity.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent activity found.</p>}
        </div>
      </div>
    </div>
  );
}

// Sub-components
function StatCard({ title, value, trend, tag, icon, isAlert, extra }: any) {
  return (
    <div className="dark-card stat-card" style={isAlert ? { border: '1px solid var(--accent-red)' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ color: isAlert ? 'var(--accent-red)' : 'var(--text-muted)' }}>{icon}</div>
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

function TableRow({ company, category, value, status, isWarn }: any) {
  return (
    <tr style={{ background: 'transparent' }}>
      <td style={styles.td}><strong style={{ color: 'var(--text-main)' }}>{company}</strong></td>
      <td style={styles.td}>{category}</td>
      <td style={styles.td}><strong style={{ color: 'var(--text-main)' }}>{value}</strong></td>
      <td style={styles.td}>
        <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 10, fontWeight: 700, background: isWarn ? 'var(--timeline-warn-bg)' : 'var(--bg-badge)', color: isWarn ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
          {status}
        </span>
      </td>
      <td style={{...styles.td, textAlign: 'right'}}>
        <button style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-dark)', padding: '6px 14px', borderRadius: 50, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Review</button>
      </td>
    </tr>
  );
}

function TimelineItem({ icon, title, desc, time, isWarn, isDanger }: any) {
  const bg = isDanger ? 'var(--timeline-danger-bg)' : isWarn ? 'var(--timeline-warn-bg)' : 'var(--bg-badge)';
  const color = isDanger ? 'var(--accent-red)' : isWarn ? 'var(--accent-yellow)' : 'var(--text-muted)';
  
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
  link: { fontSize: 11, fontWeight: 700, color: 'var(--accent-yellow)', textDecoration: 'underline', cursor: 'pointer' },
  th: { background: 'transparent', textAlign: 'left' as const, padding: '0 16px 12px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border-dark)' },
  td: { padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-hover)' },
  timeline: { display: 'flex', flexDirection: 'column' as const, gap: 0, marginTop: 24 },
  tlItem: { position: 'relative' as const, paddingLeft: 28, paddingBottom: 20 },
  tlLine: { position: 'absolute' as const, left: 11, top: 24, bottom: -4, width: 2, background: 'var(--border-dark)' },
  tlIcon: { position: 'absolute' as const, left: 0, top: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  tlContent: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  tlTitle: { margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-main)' },
  tlDesc: { margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 },
  tlTime: { fontSize: 9, fontWeight: 700, color: 'var(--border-dark)', marginTop: 4 },
};
