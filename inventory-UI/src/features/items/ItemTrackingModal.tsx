import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { itemService, Item } from '@/services/item.service';
import { formatDistanceToNow } from 'date-fns';
import { 
  X, 
  Package, 
  Edit, 
  Wrench, 
  User, 
  AlertTriangle, 
  Activity,
  Image as ImageIcon,
  MapPin
} from 'lucide-react';
import { API_ROOT_URL } from '@/lib/config';

interface ItemTrackingModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

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
  TRANSFERRED: 'Asset Transferred'
};

const getActionDetails = (action: string, isFailed: boolean) => {
  if (isFailed) return { icon: <AlertTriangle size={16} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  
  if (action.includes('CREATE')) return { icon: <Package size={16} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  if (action.includes('REPAIR')) return { icon: <Wrench size={16} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
  if (action.includes('ASSIGN')) return { icon: <User size={16} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
  if (action.includes('DELETE') || action.includes('LOST')) return { icon: <AlertTriangle size={16} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  
  return { icon: <Edit size={16} />, color: 'var(--text-main)', bg: 'var(--search-bg)' };
};

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
      padding: '6px 14px', borderRadius: 50, fontSize: 11, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
      textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
      {status ? status.replace(/_/g, ' ') : 'UNKNOWN'}
    </div>
  );
};

export default function ItemTrackingModal({ item, isOpen, onClose }: ItemTrackingModalProps) {
  const [activeTab, setActiveTab] = React.useState<'timeline' | 'ownership'>('timeline');

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['item-timeline', item?.id],
    queryFn: () => itemService.getItemTimeline(item!.id),
    enabled: !!item?.id && isOpen
  });

  if (!isOpen || !item) return null;

  const events = (timelineData as any)?.events || [];

  const getResolvedImageUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${API_ROOT_URL}/${url.replace(/^\//, '')}`;
  };

  const resolvedImage = getResolvedImageUrl(item.imageUrl);

  return (
    <div className="modal-overlay" onClick={onClose} style={styles.overlay}>
      <div className="pure-glass-modal" onClick={e => e.stopPropagation()} style={styles.modal}>
        
        <button onClick={onClose} style={styles.closeBtn}>
          <X size={20} />
        </button>

        <div style={styles.header}>
          <Activity size={24} color="var(--accent-yellow)" />
          <h2 style={styles.title}>Asset Journey</h2>
        </div>

        {/* Top Header Information */}
        <div style={styles.heroSection}>
          <div style={styles.heroImageWrap}>
            {resolvedImage ? (
              <img 
                src={resolvedImage} 
                alt={item.name} 
                style={styles.heroImage} 
                onError={(e) => { 
                  e.currentTarget.style.display = 'none'; 
                  e.currentTarget.parentElement!.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>';
                }} 
              />
            ) : (
              <ImageIcon size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            )}
          </div>
          <div>
            <h3 style={styles.heroName}>{item.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <StatusBadge status={item.status} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.barcode}</span>
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(255, 224, 83, 0.05)', borderRadius: 10, border: '1px solid rgba(255, 224, 83, 0.2)', width: 'fit-content' }}>
                <MapPin size={14} color="var(--accent-yellow)" />
                <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 700 }}>
                  {item.company?.name || 'KTMG'} / {item.department?.name || 'General'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.2)', width: 'fit-content' }}>
                <User size={14} color="#3b82f6" />
                <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 700 }}>
                  {item.assignedToName ? `Holder: ${item.assignedToName}` : 'In Storage / Warehouse'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 24, borderBottom: '1px solid var(--border-dark)', justifyContent: 'center' }}>
          <button 
            onClick={() => setActiveTab('timeline')}
            style={{ 
              padding: '12px 16px', color: activeTab === 'timeline' ? 'var(--accent-yellow)' : 'var(--text-muted)',
              background: 'transparent', border: 'none', borderBottom: activeTab === 'timeline' ? '2px solid var(--accent-yellow)' : '2px solid transparent',
              fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}
          >
            Activity Timeline
          </button>
          <button 
            onClick={() => setActiveTab('ownership')}
            style={{ 
              padding: '12px 16px', color: activeTab === 'ownership' ? 'var(--accent-yellow)' : 'var(--text-muted)',
              background: 'transparent', border: 'none', borderBottom: activeTab === 'ownership' ? '2px solid var(--accent-yellow)' : '2px solid transparent',
              fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}
          >
            Ownership History
          </button>
        </div>

        {/* Center ZigZag Timeline */}
        <div className="timeline-scroll-area" style={styles.timelineWrapper}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><div className="loading-spinner" /></div>
          ) : activeTab === 'ownership' ? (
            /* Ownership History Table */
            <div style={{ 
              padding: '16px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: 16, 
              border: '1px solid var(--border-dark)',
              backdropFilter: 'blur(10px)',
              margin: '0 10px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    backdropFilter: 'blur(5px)',
                    borderBottom: '1px solid var(--border-dark)' 
                  }}>
                    <th style={{ background: 'transparent', textAlign: 'left', padding: '14px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Assigned To</th>
                    <th style={{ background: 'transparent', textAlign: 'left', padding: '14px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>From Date</th>
                    <th style={{ background: 'transparent', textAlign: 'left', padding: '14px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Released Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const tenures: any[] = [];
                    // Process timeline events chronologically
                    const sortedEvents = [...events].reverse();
                    let currentTenure: any = null;

                    sortedEvents.forEach((ev: any) => {
                      const holder = ev.toPersonName || (ev.toDepartment?.name ? `Dept: ${ev.toDepartment.name}` : null);
                      
                      if (ev.eventType === 'ASSIGNED_TO_PERSON' || ev.eventType === 'ASSIGNED_TO_DEPARTMENT' || ev.eventType === 'ITEM_ADDED' || ev.eventType === 'TRANSFERRED') {
                        if (holder) {
                          if (currentTenure) {
                            currentTenure.releasedDate = new Date(ev.createdAt).toLocaleDateString();
                          }
                          currentTenure = {
                            holder: holder,
                            fromDate: new Date(ev.createdAt).toLocaleDateString(),
                            releasedDate: 'Present'
                          };
                          tenures.push(currentTenure);
                        }
                      } else if (ev.eventType === 'UNASSIGNED') {
                        if (currentTenure) {
                          currentTenure.releasedDate = new Date(ev.createdAt).toLocaleDateString();
                          currentTenure = null; // No active tenure after unassign
                        }
                      }
                    });

                    if (tenures.length === 0) return (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                          No formal assignments recorded.
                        </td>
                      </tr>
                    );

                    return [...tenures].reverse().map((t, i) => (
                      <tr key={i} style={{ 
                        borderBottom: '1px solid var(--border-dark)', 
                        transition: 'background 0.2s' 
                      }} className="history-row-hover">
                        <td style={{ padding: '16px 14px' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>{t.holder}</span>
                        </td>
                        <td style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{t.fromDate}</td>
                        <td style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{t.releasedDate}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="zigzag-timeline">
              <div className="timeline-center-line" />
              {events.map((ev: any, idx: number) => {
                    const isFailed = false; // Item events aren't 'failed' records
                    const config = getActionDetails(ev.eventType, isFailed);
                    
                    let friendlyAction = ACTION_MAP[ev.eventType] || ev.eventType.replace(/_/g, ' ');
                    if (ev.toPersonName) {
                      friendlyAction = `Assigned to ${ev.toPersonName}`;
                    } else if (ev.eventType === 'UNASSIGNED' && ev.fromPersonName) {
                      friendlyAction = `Released from ${ev.fromPersonName}`;
                    }

                    const isLeft = idx % 2 === 0;
                
                return (
                  <div key={ev.id} className={`zigzag-item ${isLeft ? 'left' : 'right'}`} style={{ animationDelay: `${idx * 0.15 + 0.2}s` }}>
                    <div className="zz-icon" style={{ background: config.bg, color: config.color, borderColor: config.color }}>
                      {config.icon}
                    </div>
                    <div className="zz-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <h4 style={styles.tlTitle}>{friendlyAction}</h4>
                        <span style={styles.tlTime}>{formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true })}</span>
                      </div>
                      
                      <p style={styles.tlDesc}>Action by <strong style={{ color: 'var(--text-main)' }}>{ev.performedByUser?.email?.split('@')[0] || 'System'}</strong></p>
                      
                      {(ev.toLocation || ev.toDepartment?.name || ev.notes) && (
                        <div style={styles.tlMeta}>
                          {ev.toDepartment?.name && <span style={styles.metaPill}>Dept: {ev.toDepartment.name}</span>}
                          {ev.toLocation && <span style={styles.metaPill}>Location: {ev.toLocation}</span>}
                          {ev.notes && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 8 }}>"{ev.notes}"</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .modal-overlay {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: fadeIn 0.2s ease-out forwards;
        }
        
        .pure-glass-modal {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        html[data-theme="light"] .pure-glass-modal {
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
        }

        .zigzag-timeline {
          position: relative;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 0 20px;
        }

        .timeline-center-line {
          position: absolute;
          left: 50%;
          top: 40px;
          bottom: 20px;
          width: 2px;
          background: var(--border-dark);
          opacity: 0.5;
          margin-left: -1px;
          transform-origin: top;
          transform: scaleY(0);
          animation: lineGrow 1.2s cubic-bezier(0.85, 0, 0.15, 1) forwards;
        }

        .zigzag-item {
          display: flex;
          position: relative;
          width: 100%;
          margin-bottom: 40px;
          align-items: center;
          opacity: 0;
          transform: translateY(20px);
          animation: cascadeSlide 0.5s ease-out forwards;
        }

        .zigzag-item.left {
          justify-content: flex-start;
        }

        .zigzag-item.right {
          justify-content: flex-end;
        }

        .zz-icon {
          position: absolute;
          left: 50%;
          transform: translateX(-50%) scale(0.5);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          border: 2px solid;
          opacity: 0;
          box-shadow: 0 0 0 6px rgba(15,23,42,0.8);
          animation: popIcon 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          /* Inherit delay from parent via calc trick if possible, but we'll apply global rule via cascading child */
        }

        .zigzag-item > .zz-icon {
          animation-delay: inherit;
        }

        html[data-theme="light"] .zz-icon {
           box-shadow: 0 0 0 6px rgb(255 255 255 / 80%);
        }

        .zz-content {
          width: calc(50% - 44px);
          background: var(--bg-card);
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid var(--border-dark);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: default;
        }
        
        .zz-content:hover {
           transform: translateY(-4px) scale(1.02);
           border-color: var(--accent-yellow);
           box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.2);
        }

        .history-row-hover:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        /* Mobile Responsive Override */
        @media (max-width: 600px) {
          .timeline-center-line {
            left: 24px;
            transform-origin: top left;
          }
          .zz-icon {
            left: 24px;
          }
          .zigzag-item.left, .zigzag-item.right {
            justify-content: flex-end;
            flex-direction: row;
          }
          .zz-content {
            width: calc(100% - 64px);
          }
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes lineGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes cascadeSlide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIcon { from { opacity: 0; transform: translateX(-50%) scale(0.2); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        
        @media (max-width: 600px) {
          @keyframes popIcon { from { opacity: 0; transform: translateX(-50%) scale(0.2); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, any> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px'
  },
  modal: {
    width: '100%', maxWidth: '800px', maxHeight: '90vh',
    borderRadius: '16px', padding: '32px',
    display: 'flex', flexDirection: 'column',
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute', top: 24, right: 24,
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    padding: 8, borderRadius: '50%', transition: 'background 0.2s',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-dark)', flexShrink: 0
  },
  title: {
    fontSize: 22, fontWeight: 800, color: 'var(--text-main)', margin: 0
  },
  heroSection: {
    display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24,
    justifyContent: 'center', flexWrap: 'wrap', flexShrink: 0
  },
  heroImageWrap: {
    width: 140, height: 140, borderRadius: '12px',
    background: 'var(--bg-card)', border: '1px solid var(--border-dark)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)'
  },
  heroImage: {
    width: '100%', height: '100%', objectFit: 'cover'
  },
  heroName: {
    fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-main)', textAlign: 'center'
  },
  timelineWrapper: {
    flex: 1, 
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: 8
  },
  tlTitle: {
    margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-main)'
  },
  tlTime: {
    fontSize: 11, color: 'var(--text-muted)', opacity: 0.8
  },
  tlDesc: {
    margin: 0, fontSize: 13, color: 'var(--text-muted)'
  },
  tlMeta: {
    display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12,
    paddingTop: 12, borderTop: '1px solid var(--border-dark)'
  },
  metaPill: {
    fontSize: 10, color: 'var(--text-main)', fontWeight: 600,
    background: 'var(--search-bg)', padding: '4px 8px', borderRadius: 6,
    border: '1px solid var(--border-dark)'
  }
};
