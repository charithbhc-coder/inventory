import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  X, 
  History, 
  FileText, 
  User, 
  Building, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Download,
  Trash2,
  UserPlus,
  Wrench,
  BadgeDollarSign,
  Layers,
  Link,
  ChevronRight,
  Camera,
  AlertOctagon,
  Hash
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { itemService, Item } from '@/services/item.service';
import { format } from 'date-fns';
import AssignModal from './AssignModal';
import RepairModal from './RepairModal';
import DisposeModal from './DisposeModal';
import ReportLostModal from './ReportLostModal';
import ReturnFromRepairModal from './ReturnFromRepairModal';
import RecoverItemModal from './RecoverItemModal';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission, ItemStatus } from '@/types';
import { getUploadUrl } from '@/lib/config';
import QrPrintModal from '@/components/qr/QrPrintModal';

interface DrawerProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetDetailsDrawer({ item: initialItem, isOpen, onClose }: DrawerProps) {
  // Fetch full timeline and latest details
  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['item-timeline', initialItem.id],
    queryFn: () => itemService.getItemTimeline(initialItem.id),
    enabled: isOpen
  });

  const item = timelineData?.item || initialItem;
  const events = timelineData?.events || [];

  const [activeModal, setActiveModal] = useState<'assign' | 'repair' | 'dispose' | 'lost' | 'return' | 'recover' | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const hasPermission = useAuthStore(s => s.hasPermission);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {item.imageUrl ? (
                <img 
                  src={getUploadUrl(item.imageUrl)} 
                  alt={item.name} 
                  className="asset-image-preview" 
                />
              ) : (
                <div className="asset-icon">
                  <Camera size={24} />
                </div>
              )}
              <div>
                <h3 className="text-lg font-extrabold text-white leading-tight">{item.name}</h3>
                <span className="text-xs font-mono font-bold text-accent">{item.barcode}</span>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          
          <div className="flex gap-2">
             <StatusBadge status={item.status} />
             <div className="badge-outline">
               {item.category.name}
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="drawer-body custom-scrollbar">
          

          {/* Quick Actions Bar */}
          <div className="action-hub mb-8">

            {/* Repair Lock Banner */}
            {(item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR) && (
              <div style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#f59e0b',
              }}>
                <Wrench size={14} style={{ flexShrink: 0 }} />
                {item.status === ItemStatus.SENT_TO_REPAIR
                   ? 'Asset is physically SENT TO REPAIR — only Return or Dispose are available.'
                   : 'Asset is IN REPAIR — only Return or Dispose are available.'}
              </div>
            )}

            {/* Lost Lock Banner */}
            {item.status === ItemStatus.LOST && (
              <div style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(225, 29, 72, 0.1)',
                border: '1.5px solid rgba(225, 29, 72, 0.35)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#e11d48',
              }}>
                <AlertOctagon size={14} style={{ flexShrink: 0 }} />
                Asset is reported LOST — you must Recover it before assigning or repairing.
              </div>
            )}

            {hasPermission(AdminPermission.ASSIGN_ITEMS) && (
              <div style={{ position: 'relative', flex: 1, display: 'flex', gap: 8 }} title={
                (item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR)
                  ? 'Cannot assign — item is currently in repair'
                  : item.status === ItemStatus.LOST
                  ? 'Cannot assign — item is reported lost'
                  : undefined
              }>
                <button
                  className="hub-btn"
                  onClick={() => setActiveModal('assign')}
                  disabled={item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR || item.status === ItemStatus.LOST}
                  style={(item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR || item.status === ItemStatus.LOST)
                    ? { opacity: 0.4, cursor: 'not-allowed', flex: 1 }
                    : { flex: 1 }
                  }
                >
                  <UserPlus size={16} style={{ flexShrink: 0 }} />
                  <span>{item.assignedToName ? 'Reassign' : 'Assign'}</span>
                </button>

                {item.status === ItemStatus.IN_USE && (
                  <button
                    className="hub-btn"
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to return "${item.name}" to the warehouse? This will remove the current assignment.`)) {
                        try {
                          await itemService.unassignItem(item.id);
                          window.location.reload(); // Refresh to show updated state
                        } catch (err) {
                          alert('Failed to return to warehouse');
                        }
                      }
                    }}
                    style={{ flex: 1, background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6' }}
                  >
                    <Building size={16} />
                    <span>Return</span>
                  </button>
                )}
              </div>
            )}
            {hasPermission(AdminPermission.MANAGE_REPAIRS) && (
              (item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR) ? (
                <button className="hub-btn success" onClick={() => setActiveModal('return')}>
                  <CheckCircle2 size={16} />
                  <span>Return</span>
                </button>
              ) : (
                <div style={{ position: 'relative', flex: 1, display: 'flex' }} title={
                  item.status === ItemStatus.LOST ? 'Cannot repair — item is reported lost' : undefined
                }>
                  <button 
                    className="hub-btn" 
                    onClick={() => setActiveModal('repair')}
                    disabled={item.status === ItemStatus.LOST}
                    style={item.status === ItemStatus.LOST ? { opacity: 0.4, cursor: 'not-allowed', flex: 1 } : { flex: 1 }}
                  >
                    <Wrench size={16} />
                    <span>Repair</span>
                  </button>
                </div>
              )
            )}
            {item.status === ItemStatus.LOST ? (
              <button className="hub-btn success" onClick={() => setActiveModal('recover')} style={{ flex: 1.5 }}>
                <CheckCircle2 size={16} />
                <span>Found Asset</span>
              </button>
            ) : (
              hasPermission(AdminPermission.UPDATE_ITEMS) && (
                <div style={{ position: 'relative', flex: 1, display: 'flex' }} title={
                  (item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR)
                    ? 'Cannot mark as lost — item is currently in repair. Return it first.'
                    : undefined
                }>
                  <button
                    className="hub-btn danger"
                    onClick={() => setActiveModal('lost')}
                    disabled={item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR}
                    style={(item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR)
                      ? { opacity: 0.4, cursor: 'not-allowed', flex: 1 }
                      : { flex: 1 }
                    }
                  >
                    <AlertOctagon size={16} style={{ flexShrink: 0 }} />
                    <span>Lost</span>
                  </button>
                </div>
              )
            )}
            {hasPermission(AdminPermission.MANAGE_DISPOSALS) && (
              <button className="hub-btn danger" onClick={() => setActiveModal('dispose')} style={{ opacity: 0.8 }}>
                <Trash2 size={16} />
                <span>Dispose</span>
              </button>
            )}
          </div>


          {/* QR Code */}
          <div className="qr-container mb-8">
            <div className="flex justify-between items-center w-full mb-3">
              <div className="qr-label">ASSET QR CODE</div>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="print-trigger-btn"
                title="Print / Save QR Code"
              >
                <Download size={14} />
                <span>Print / Save</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: 16,
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '3px solid #ffe053',
              }}>
                <QRCodeCanvas
                  value={`${window.location.origin}/inventory/items/${item.id}`}
                  size={180}
                  marginSize={1}
                  level="H"
                  fgColor="#1b2d3e"
                  bgColor="#ffffff"
                />
                <span style={{ fontSize: 8, fontWeight: 900, color: '#1b2d3e', letterSpacing: '0.15em', textTransform: 'uppercase' }}>SCAN TO OPEN</span>
                <span style={{ fontSize: 11, fontWeight: 900, fontFamily: 'monospace', color: '#1b2d3e', letterSpacing: '0.12em' }}>{item.barcode}</span>
              </div>
            </div>
          </div>

          {/* Core Info */}
          <section className="mb-8 section-mt">
            <h4 className="section-title">Specifications</h4>
            <div className="info-grid">
              <InfoItem icon={<User size={14} />} label="Assigned To" value={item.assignedToName || 'Unassigned'} />
              <InfoItem icon={<Building size={14} />} label="Subsidiary" value={item.company.name} />
              <InfoItem icon={<FileText size={14} />} label="Remarks" value={item.remarks || 'None'} />
              <InfoItem icon={<Hash size={14} />} label="Serial Number" value={item.serialNumber || 'N/A'} />
              <InfoItem icon={<ShieldCheck size={14} />} label="Warranty" value={item.warrantyExpiresAt ? format(new Date(item.warrantyExpiresAt), 'MMM dd, yyyy') : 'No Warranty'} color={item.warrantyExpiresAt ? 'var(--accent-yellow)' : 'inherit'} />
              <InfoItem icon={<BadgeDollarSign size={14} />} label="Value (LKR)" value={item.purchasePrice ? Number(item.purchasePrice).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00'} />
            </div>
          </section>

          {/* Asset Notes */}
          {item.remarks && (
            <section className="mb-8 section-mt">
              <h4 className="section-title flex items-center gap-2">
                <FileText size={16} />
                Asset Remarks
              </h4>
              <div style={{ 
                padding: '20px', 
                background: 'rgba(255, 224, 83, 0.08)', 
                border: '1.5px solid rgba(255, 224, 83, 0.15)', 
                borderRadius: '14px',
                fontSize: '13.5px',
                color: '#ffffff',
                lineHeight: '1.6',
                fontWeight: 600,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {item.remarks}
              </div>
            </section>
          )}

          {/* Hierarchy Tracking */}
          {(item.parentItem || (item.childItems && item.childItems.length > 0)) && (
            <section className="mb-8">
              <h4 className="section-title flex items-center gap-2">
                <Layers size={16} />
                Asset Hierarchy
              </h4>
              <div className="flex flex-col gap-2">
                {/* Parent Link */}
                {item.parentItem && (
                  <div className="hierarchy-item parent">
                    <div className="flex items-center gap-3">
                      <div className="icon-box"><Link size={14} /></div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted mb-[2px]">Installed In (Parent)</div>
                        <div className="text-sm font-bold text-white">{item.parentItem.name}</div>
                      </div>
                    </div>
                    <div className="barcode-badge">{item.parentItem.barcode}</div>
                  </div>
                )}
                
                {/* Child Components */}
                {item.childItems && item.childItems.length > 0 && (
                  <div className="hierarchy-box">
                    <div className="text-[10px] uppercase font-bold text-muted mb-3 px-1">Attached Components ({item.childItems.length})</div>
                    <div className="flex flex-col gap-2">
                      {item.childItems.map((child: any) => (
                        <div key={child.id} className="hierarchy-item child">
                          <div className="flex items-center gap-3">
                            <ChevronRight size={14} className="text-muted" />
                            <div>
                              <div className="text-sm font-bold text-white">{child.name}</div>
                              <div className="text-xs text-muted">{child.category?.name || 'Component'}</div>
                            </div>
                          </div>
                          <div className="barcode-badge">{child.barcode}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Document Vault */}
          <section className="mb-8 section-mt">
            <h4 className="section-title flex items-center gap-2">
              <FileText size={16} />
              Digital Vault
            </h4>
            <div className="flex flex-col gap-2">
                {item.warrantyCardUrls?.length ? item.warrantyCardUrls.map((url: string, i: number) => (
                  <div key={i} onClick={() => setPreviewUrl(getUploadUrl(url))} className="doc-item" style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} className="text-accent" />
                      <span>Warranty Certificate {i + 1}</span>
                    </div>
                    <Download size={14} />
                  </div>
                )) : (
                  <div className="doc-empty">No warranty documents uploaded</div>
                )}
                {item.invoiceUrls?.length ? item.invoiceUrls.map((url: string, i: number) => (
                  <div key={i} onClick={() => setPreviewUrl(getUploadUrl(url))} className="doc-item" style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-secondary" />
                      <span>Invoice {format(new Date(item.purchaseDate || Date.now()), 'yyyy')}</span>
                    </div>
                    <Download size={14} />
                  </div>
                )) : (
                  <div className="doc-empty">No invoices available</div>
                )}
            </div>
          </section>

          {/* Timeline */}
          <section className="section-mt" style={{ paddingBottom: 40 }}>
            <h4 className="section-title flex items-center gap-2 mb-4">
              <History size={16} />
              History Log
            </h4>
            <div className="timeline">
              {isLoading ? (
                <div className="text-center py-4 text-xs opacity-50">Loading history...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-4 text-xs opacity-50">No events logged yet</div>
              ) : events.map((event: any, i: number) => (
                <div key={event.id} className="timeline-item">
                  <div className="timeline-marker">
                    {i === 0 ? <CheckCircle2 size={14} className="text-accent" /> : <Clock size={14} />}
                  </div>
                  <div className="timeline-content">
                    <div className="flex justify-between items-center mb-1">
                      <span className="event-type">{event.eventType.replace(/_/g, ' ')}</span>
                      <span className="event-date">{format(new Date(event.createdAt), 'MMM dd, HH:mm')}</span>
                    </div>
                    <p className="event-note">{event.notes}</p>
                    <div className="event-meta">
                      By {event.performedByUser?.firstName ? `${event.performedByUser.firstName} ${event.performedByUser.lastName}` : (event.performedByUser?.name || 'System')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Dynamic Modals */}
        <AssignModal item={item} isOpen={activeModal === 'assign'} onClose={() => setActiveModal(null)} />
        <RepairModal item={item} isOpen={activeModal === 'repair'} onClose={() => setActiveModal(null)} />
        <DisposeModal item={item} isOpen={activeModal === 'dispose'} onClose={() => setActiveModal(null)} />
        <ReportLostModal item={item} isOpen={activeModal === 'lost'} onClose={() => setActiveModal(null)} />
        <ReturnFromRepairModal item={item} isOpen={activeModal === 'return'} onClose={() => setActiveModal(null)} />
        <RecoverItemModal item={item} isOpen={activeModal === 'recover'} onClose={() => setActiveModal(null)} />

        {/* QR Print Modal */}
        <QrPrintModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          itemId={item.id}
          itemName={item.name}
          assetCode={item.barcode}
        />

        {/* Document Preview Popup */}
        {previewUrl && (
          <div className="doc-preview-overlay" onClick={() => setPreviewUrl(null)}>
            <div className="doc-preview-container" onClick={e => e.stopPropagation()}>
              <div className="preview-header">
                <h3>Document Snapshot</h3>
                <div className="flex gap-2">
                   <a href={previewUrl} download className="preview-action-btn"><Download size={16} /></a>
                   <button onClick={() => setPreviewUrl(null)} className="preview-action-btn"><X size={16} /></button>
                </div>
              </div>
              <div className="preview-body">
                {previewUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={previewUrl} className="preview-frame" title="PDF Preview" />
                ) : (
                  <img src={previewUrl} className="preview-img" alt="Document Preview" />
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
          .drawer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            justify-content: flex-end;
          }
          .drawer {
            width: 100%;
            max-width: 440px;
            background: var(--bg-surface);
            height: 100%;
            display: flex;
            flex-direction: column;
            animation: slideLeft 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            border-left: 1px solid var(--border-dark);
            box-shadow: -20px 0 50px rgba(0,0,0,0.3);
          }
          @keyframes slideLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .drawer-header {
            padding: 32px;
            background: var(--bg-sidebar);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            color: #ffffff;
          }
          
          @media (max-width: 768px) {
            .drawer {
              max-width: 100%;
            }
            .drawer-header, .drawer-body {
              padding: 24px 20px;
            }
            .info-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
            .action-hub {
              flex-wrap: wrap;
              gap: 4px;
              padding: 6px;
            }
            .hub-btn {
              flex: 1 1 calc(50% - 8px);
              min-width: 120px;
              font-size: 11px;
              padding: 12px 8px;
            }
          }

          .asset-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            color: var(--accent-yellow);
            border: 1px solid var(--border-dark);
          }
          .asset-image-preview {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            object-fit: cover;
            border: 1px solid var(--border-dark);
          }
          .qr-container {
            padding: 16px;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border-dark);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .qr-label {
            font-size: 9px;
            font-weight: 900;
            color: var(--text-muted);
            letter-spacing: 0.15em;
          }
          .print-trigger-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 224, 83, 0.1);
            border: 1px solid rgba(255, 224, 83, 0.2);
            padding: 4px 10px;
            border-radius: 6px;
            color: var(--accent-yellow);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.2s;
          }
          .print-trigger-btn:hover {
            background: var(--accent-yellow);
            color: #000;
            transform: translateY(-1px);
          }
          .section-mt {
            margin-top: 32px;
          }
          .close-btn {
            background: rgba(255,255,255,0.1);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            transition: all 0.2s;
            cursor: pointer;
          }
          .close-btn:hover { background: var(--accent-red); }
          .drawer-body {
            padding: 32px;
            flex: 1;
            overflow-y: auto;
          }
          .section-title {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--text-main);
            margin-bottom: 16px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .info-item {
            padding: 12px;
            background: var(--bg-dark);
            border-radius: 10px;
            border: 1px solid var(--border-dark);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .info-item:hover {
            transform: translateY(-3px);
            border-color: var(--accent-yellow);
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            background: var(--bg-sidebar);
          }
          .action-hub {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 4px;
            background: var(--bg-dark);
            border-radius: 12px;
            border: 1px solid var(--border-dark);
          }
          .hub-btn {
            flex: 1;
            padding: 10px;
            border-radius: 8px;
            background: transparent;
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
          }
          .hub-btn:hover { 
            background: var(--bg-surface); 
            color: var(--text-main);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .hub-btn.danger {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.05);
          }
          .hub-btn.danger:hover {
            background: rgba(239, 68, 68, 0.1);
          }
          .hub-btn.success {
            color: #10b981;
            background: rgba(16, 185, 129, 0.05);
          }
          .hub-btn.success:hover {
            background: rgba(16, 185, 129, 0.1);
          }
          .hierarchy-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--bg-dark);
            border: 1px solid var(--border-dark);
            border-radius: 12px;
          }
          .hierarchy-item.parent {
            border-color: rgba(139, 92, 246, 0.3);
            background: linear-gradient(to right, rgba(139, 92, 246, 0.05), var(--bg-dark));
          }
          .icon-box {
            width: 28px; height: 28px;
            border-radius: 8px;
            background: rgba(139, 92, 246, 0.15);
            color: #8b5cf6;
            display: flex; align-items: center; justify-content: center;
          }
          .hierarchy-box {
            padding: 16px;
            background: rgba(0,0,0,0.2);
            border: 1px dashed var(--border-dark);
            border-radius: 12px;
          }
          .barcode-badge {
            font-family: monospace;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 6px;
            color: var(--text-muted);
          }
          .doc-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            background: var(--bg-dark);
            border: 1px solid var(--border-dark);
            border-radius: 12px;
            text-decoration: none;
            color: var(--text-main);
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
          }
          .doc-item:hover { border-color: var(--accent-yellow); transform: translateY(-2px); }
          .doc-empty {
            padding: 16px;
            text-align: center;
            font-size: 12px;
            color: var(--text-muted);
            background: rgba(255,255,255,0.02);
            border: 1px dashed var(--border-dark);
            border-radius: 12px;
          }

          .timeline { position: relative; padding-left: 24px; }
          .timeline::before {
            content: '';
            position: absolute;
            left: 6px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--border-dark);
          }
          .timeline-item { position: relative; margin-bottom: 24px; }
          .timeline-marker {
            position: absolute;
            left: -24px;
            top: 0;
            width: 14px;
            height: 14px;
            background: var(--bg-surface);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            color: var(--text-muted);
          }
          .event-type { font-size: 12px; font-weight: 900; text-transform: uppercase; color: var(--text-main); letter-spacing: 0.02em; }
          .event-date { font-size: 10px; font-weight: 800; color: var(--text-main); }
          .event-note { font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.5; font-weight: 600; }
          .event-meta { font-size: 11px; color: var(--text-main); margin-top: 6px; font-weight: 800; font-style: italic; }

          .badge-outline {
            padding: 4px 12px;
            border-radius: 50px;
            border: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.6);
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }

          /* Preview Popup Styles */
          .doc-preview-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.85);
            backdrop-filter: blur(8px); z-index: 2000;
            display: flex; align-items: center; justify-content: center;
            padding: 40px;
            animation: fadeIn 0.3s ease;
          }
          .doc-preview-container {
            width: 100%; max-width: 900px; height: 100%;
            background: var(--bg-surface); border-radius: 20px;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 30px 100px rgba(0,0,0,0.5);
            animation: popUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .preview-header {
            padding: 16px 24px; background: var(--bg-sidebar);
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid var(--border-dark);
          }
          .preview-header h3 { margin: 0; font-size: 14px; font-weight: 900; color: #fff; letter-spacing: 0.05em; text-transform: uppercase; }
          .preview-action-btn {
            width: 36px; height: 36px; border-radius: 10px;
            background: rgba(255,255,255,0.05); color: #fff;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s; border: none; cursor: pointer;
          }
          .preview-action-btn:hover { background: var(--accent-yellow); color: #000; }
          .preview-body { flex: 1; display: flex; align-items: center; justify-content: center; background: #0b0f19; overflow: auto; }
          .preview-frame { width: 100%; height: 100%; border: none; }
          .preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }

          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes popUp { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

          @media (max-width: 600px) {
            .doc-preview-overlay {
              padding: 10px;
            }
            .doc-preview-container {
              border-radius: 0;
              height: 100%;
            }
            .preview-header {
              padding: 12px 16px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
      textTransform: 'uppercase'
    }}>
      {status.replace(/_/g, ' ')}
    </div>
  );
}

function InfoItem({ icon, label, value, color }: { icon: any, label: string, value: string, color?: string }) {
  return (
    <div className="info-item">
      <div className="flex items-center gap-2 mb-1 opacity-50">
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
    </div>
  );
}
