import { X, Activity, User, Globe, Hash } from 'lucide-react';
import { AuditLog } from '@/services/audit-log.service';
import { format } from 'date-fns';

interface DrawerProps {
  log: AuditLog;
  isOpen: boolean;
  onClose: () => void;
}

const KEY_MAP: Record<string, string> = {
  name: 'Name',
  code: 'Code',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  isActive: 'Status',
  role: 'Role',
  assignedToId: 'Assigned To (ID)',
  companyId: 'Subsidiary (ID)',
  departmentId: 'Department (ID)',
  categoryId: 'Category (ID)',
  brand: 'Brand',
  model: 'Model',
  serialNumber: 'Serial Number',
  barcode: 'Barcode',
  location: 'Location',
  purchasePrice: 'Purchase Price',
  purchaseDate: 'Purchase Date',
  warrantyExpiresAt: 'Warranty Expiry',
  notes: 'Notes',
  status: 'Item Status',
};

const EXCLUDE_KEYS = ['url', 'method', 'duration', 'ip', 'userAgent', 'id', 'createdAt', 'updatedAt', 'password', 'passwordResetToken', 'passwordResetExpires'];

const ACTION_MAP: Record<string, string> = {
  CREATE_ITEM: 'Added New Asset',
  UPDATE_ITEM: 'Updated Asset details',
  DELETE_ITEM: 'Decommissioned Asset',
  CREATE_COMPANY: 'Created New Subsidiary',
  UPDATE_COMPANY: 'Modified Subsidiary details',
  CREATE_USER: 'Registered System User',
  UPDATE_USER: 'Modified User Profile',
  CREATE_CATEGORY: 'Added Asset Category',
  UPDATE_CATEGORY: 'Modified Category details',
  CREATE_IMAGE: 'Uploaded Asset Image',
  UPDATE_IMAGE: 'Updated Asset Image',
  LOGIN: 'User Authentication',
  LOGOUT: 'User Session ended',
  ASSIGN_ITEM: 'Assigned Asset to User',
  UNASSIGN_ITEM: 'Unassigned Asset',
  REPAIR_ITEM: 'Initiated Asset Repair',
};

export default function AuditLogDetailDrawer({ log, isOpen, onClose }: DrawerProps) {
  if (!isOpen) return null;

  const formatValue = (key: string, val: any) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'boolean') return val ? 'Active / Yes' : 'Inactive / No';
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('expires') || key.toLowerCase().includes('at')) {
      try {
        return format(new Date(val), 'MMM dd, yyyy HH:mm');
      } catch {
        return String(val);
      }
    }
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const renderJsonDiff = (oldValues?: Record<string, any>, newValues?: Record<string, any>) => {
    if (!oldValues && !newValues) {
      return <div className="text-muted text-sm italic py-4">No data payload for this event.</div>;
    }

    const allKeys = Array.from(new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]))
      .filter(k => !EXCLUDE_KEYS.includes(k));

    if (allKeys.length === 0) {
      return <div className="text-muted text-sm italic py-4">No business-relevant data changed.</div>;
    }

    return (
      <div className="diff-container custom-scrollbar">
        {allKeys.map(key => {
          const oldVal = oldValues?.[key];
          const newVal = newValues?.[key];
          const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          if (!hasChanged) return null; 

          return (
            <div key={key} className="diff-row">
              <div className="diff-key">{KEY_MAP[key] || key}</div>
              <div className="diff-values">
                {oldVal !== undefined && (
                  <div className="diff-old">
                    <span className="diff-indicator">-</span>
                    {formatValue(key, oldVal)}
                  </div>
                )}
                {newVal !== undefined && (
                  <div className="diff-new">
                    <span className="diff-indicator">+</span>
                    {formatValue(key, newVal)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getFriendlyTitle = () => {
    const rawAction = log.action;
    const friendlyAction = ACTION_MAP[rawAction] || rawAction.replace(/_/g, ' ');
    const name = log.newValues?.name || log.oldValues?.name || log.newValues?.email || log.oldValues?.email;
    return name ? `${friendlyAction}: ${name}` : friendlyAction;
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="log-action-icon">
                <Activity size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="text-lg font-extrabold text-white leading-tight truncate" title={getFriendlyTitle()}>
                  {getFriendlyTitle()}
                </h3>
                <span className="text-xs font-mono font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  REF ID: {log.id.split('-')[0]}...
                </span>
              </div>
            </div>
            <button className="close-btn" onClick={onClose} style={{ flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>
          
          <div className="flex gap-2">
             <div className="badge-outline">
               {log.entityType || 'Application'}
             </div>
             <div className="badge-outline" style={{ borderStyle: 'dashed' }}>
               {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="drawer-body custom-scrollbar">
          
          {/* Core Info */}
          <section className="mb-8">
            <h4 className="section-title">Event Context</h4>
            <div className="info-grid">
              <InfoItem icon={<User size={14} />} label="Actor Email" value={log.userEmail} />
              <InfoItem icon={<Hash size={14} />} label="Target Entity ID" value={log.entityId || 'N/A'} />
              <InfoItem icon={<Globe size={14} />} label="IP Address" value={log.ipAddress || 'Unknown'} />
              <InfoItem icon={<Globe size={14} />} label="User Agent" value={log.userAgent ? log.userAgent.split(' ')[0] : 'Unknown'} />
            </div>
          </section>

          {/* Payload Diff */}
          <section className="mb-8 section-mt">
            <h4 className="section-title">Record Evolution</h4>
            {renderJsonDiff(log.oldValues, log.newValues)}
          </section>

        </div>

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
            max-width: 500px;
            background: var(--color-surface);
            height: 100%;
            display: flex;
            flex-direction: column;
            animation: slideLeft 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            border-left: 1px solid var(--color-border);
            box-shadow: -20px 0 50px rgba(0,0,0,0.3);
          }
          @keyframes slideLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .drawer-header {
            padding: 32px;
            background: var(--color-sidebar);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            color: #ffffff;
          }
          .log-action-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            color: var(--color-accent);
            border: 1.5px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .section-mt { margin-top: 32px; }
          .close-btn {
            background: rgba(255,255,255,0.1);
            width: 32px; height: 32px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #fff; transition: all 0.2s; cursor: pointer;
          }
          .close-btn:hover { background: var(--color-danger); }
          .drawer-body { padding: 32px; flex: 1; overflow-y: auto; background: var(--color-bg); }
          .section-title {
            font-size: 11px; font-weight: 800; text-transform: uppercase;
            letter-spacing: 0.12em; color: var(--color-text-secondary); margin-bottom: 16px;
          }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-item {
            padding: 12px; background: var(--color-surface);
            border-radius: 12px; border: 1.5px solid var(--color-border);
          }
          .badge-outline {
            padding: 4px 12px; border-radius: 50px;
            border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
            font-size: 10px; font-weight: 700; text-transform: uppercase;
          }

          /* Payload Diff Viewer */
          .diff-container {
            background: var(--color-surface-2);
            border: 1.5px solid var(--color-border);
            border-radius: 12px;
            overflow: hidden;
            font-family: monospace;
            font-size: 12px;
          }
          .diff-row { border-bottom: 1px solid var(--color-border); }
          .diff-row:last-child { border-bottom: none; }
          .diff-key {
            padding: 8px 16px;
            background: rgba(0,0,0,0.05);
            color: var(--color-text-secondary);
            font-weight: 700;
            border-bottom: 1px solid var(--color-border);
          }
          .diff-values { display: flex; flex-direction: column; }
          .diff-old {
            background: var(--color-danger-bg);
            color: var(--color-danger);
            padding: 10px 16px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            word-break: break-all;
            opacity: 0.8;
          }
          .diff-new {
            background: var(--color-success-bg);
            color: var(--color-success);
            padding: 10px 16px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            word-break: break-all;
          }
          .diff-indicator { user-select: none; opacity: 0.5; font-weight: 800; }
        `}</style>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="info-item">
      <div className="flex items-center gap-2 mb-1 opacity-50">
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={value}>
        {value}
      </div>
    </div>
  );
}
