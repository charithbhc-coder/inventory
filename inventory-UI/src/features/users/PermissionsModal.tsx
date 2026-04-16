import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Shield, X, Eye, Plus, Edit3, Trash2, Link2 } from 'lucide-react';
import { User } from '@/services/user.service';
import { AdminPermission } from '@/types';

interface PermissionGroup {
  category: string;
  permissions: {
    id: string;
    label: string;
    type: 'view' | 'create' | 'edit' | 'delete' | 'special';
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: 'Companies & Affiliates',
    permissions: [
      { id: AdminPermission.VIEW_COMPANIES, label: 'View', type: 'view' },
      { id: AdminPermission.CREATE_COMPANIES, label: 'Create', type: 'create' },
      { id: AdminPermission.UPDATE_COMPANIES, label: 'Edit', type: 'edit' },
      { id: AdminPermission.DELETE_COMPANIES, label: 'Delete', type: 'delete' },
    ],
  },
  {
    category: 'Departments & branches',
    permissions: [
      { id: AdminPermission.VIEW_DEPARTMENTS, label: 'View', type: 'view' },
      { id: AdminPermission.CREATE_DEPARTMENTS, label: 'Create', type: 'create' },
      { id: AdminPermission.UPDATE_DEPARTMENTS, label: 'Edit', type: 'edit' },
      { id: AdminPermission.DELETE_DEPARTMENTS, label: 'Delete', type: 'delete' },
    ],
  },
  {
    category: 'Staff & User Access',
    permissions: [
      { id: AdminPermission.VIEW_USERS, label: 'View', type: 'view' },
      { id: AdminPermission.CREATE_USERS, label: 'Create', type: 'create' },
      { id: AdminPermission.UPDATE_USERS, label: 'Edit', type: 'edit' },
      { id: AdminPermission.DELETE_USERS, label: 'Delete', type: 'delete' },
    ],
  },
  {
    category: 'Inventory Assets',
    permissions: [
      { id: AdminPermission.VIEW_ITEMS, label: 'View', type: 'view' },
      { id: AdminPermission.CREATE_ITEMS, label: 'Create', type: 'create' },
      { id: AdminPermission.UPDATE_ITEMS, label: 'Edit', type: 'edit' },
      { id: AdminPermission.DELETE_ITEMS, label: 'Delete', type: 'delete' },
      { id: AdminPermission.ASSIGN_ITEMS, label: 'Assign', type: 'special' },
    ],
  },
  {
    category: 'Asset Categories',
    permissions: [
      { id: AdminPermission.VIEW_CATEGORIES, label: 'View', type: 'view' },
      { id: AdminPermission.CREATE_CATEGORIES, label: 'Create', type: 'create' },
      { id: AdminPermission.UPDATE_CATEGORIES, label: 'Edit', type: 'edit' },
      { id: AdminPermission.DELETE_CATEGORIES, label: 'Delete', type: 'delete' },
    ],
  },
  {
    category: 'Software Licenses',
    permissions: [
      { id: AdminPermission.VIEW_LICENSES, label: 'View', type: 'view' },
      { id: AdminPermission.CREATE_LICENSES, label: 'Create', type: 'create' },
      { id: AdminPermission.UPDATE_LICENSES, label: 'Edit', type: 'edit' },
      { id: AdminPermission.DELETE_LICENSES, label: 'Delete', type: 'delete' },
    ],
  },
  {
    category: 'Specialized Operations',
    permissions: [
      { id: AdminPermission.MANAGE_REPAIRS, label: 'Repairs', type: 'special' },
      { id: AdminPermission.MANAGE_DISPOSALS, label: 'Disposals', type: 'special' },
      { id: AdminPermission.VIEW_WAREHOUSE, label: 'Warehouse', type: 'special' },
    ],
  },
  {
    category: 'Analysis & Logistics',
    permissions: [
      { id: AdminPermission.VIEW_REPORTS, label: 'Reports', type: 'special' },
      { id: AdminPermission.EXPORT_DATA, label: 'Export', type: 'special' },
      { id: AdminPermission.GENERATE_BARCODES, label: 'Barcodes', type: 'special' },
      { id: AdminPermission.VIEW_AUDIT_LOGS, label: 'Audit Logs', type: 'special' },
    ],
  },
];

// Migration mapping for older "Manage" style permissions
const MIGRATION_MAP: Record<string, string[]> = {
  MANAGE_COMPANIES: ['VIEW_COMPANIES', 'CREATE_COMPANIES', 'UPDATE_COMPANIES', 'DELETE_COMPANIES'],
  MANAGE_DEPARTMENTS: ['VIEW_DEPARTMENTS', 'CREATE_DEPARTMENTS', 'UPDATE_DEPARTMENTS', 'DELETE_DEPARTMENTS'],
  MANAGE_USERS: ['VIEW_USERS', 'CREATE_USERS', 'UPDATE_USERS', 'DELETE_USERS'],
  ADD_ITEMS: ['CREATE_ITEMS'],
  EDIT_ITEMS: ['UPDATE_ITEMS'],
  MANAGE_CATEGORIES: ['VIEW_CATEGORIES', 'CREATE_CATEGORIES', 'UPDATE_CATEGORIES', 'DELETE_CATEGORIES'],
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (permissions: string[]) => void;
}

export default function PermissionsModal({ isOpen, onClose, user, onSave }: Props) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<{ selectedPerms: string[] }>({
    defaultValues: { selectedPerms: [] }
  });

  const selectedPerms = watch('selectedPerms') || [];

  useEffect(() => {
    if (isOpen && user) {
      // Apply migration logic to incoming permissions
      let migrated = [...(user.permissions || [])];
      
      (user.permissions || []).forEach(p => {
        if (MIGRATION_MAP[p]) {
          migrated = migrated.filter(item => item !== p);
          MIGRATION_MAP[p].forEach(newP => {
            if (!migrated.includes(newP)) migrated.push(newP);
          });
        }
      });

      reset({ selectedPerms: migrated });
    }
  }, [isOpen, user, reset]);

  if (!isOpen || !user) return null;

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const toggleGroup = (categoryPermissions: string[], forceState?: boolean) => {
    const allSelected = categoryPermissions.every(p => selectedPerms.includes(p));
    const targetState = forceState !== undefined ? forceState : !allSelected;

    let newPerms = [...selectedPerms];
    if (targetState) {
      categoryPermissions.forEach(p => {
        if (!newPerms.includes(p)) newPerms.push(p);
      });
    } else {
      newPerms = newPerms.filter(p => !categoryPermissions.includes(p));
    }
    setValue('selectedPerms', newPerms);
  };

  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 100 }} 
        onClick={onClose} 
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border-dark)', 
        borderRadius: 20, width: '95%', maxWidth: 760, zIndex: 101,
        padding: 0, boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.5)',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={24} color="var(--accent-yellow)" />
              Security Matrix Configuration
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>
              Granular access control for <strong style={{ color: 'var(--accent-yellow)' }}>{user.firstName} {user.lastName}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--search-bg)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
          {isSuperAdmin ? (
            <div style={{ padding: 40, background: 'rgba(245, 197, 24, 0.03)', border: '2px dashed rgba(245, 197, 24, 0.2)', borderRadius: 24, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(245, 197, 24, 0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Shield size={32} color="var(--accent-yellow)" />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>Root Privileges Active</h3>
              <p style={{ margin: '0 auto', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 440 }}>
                Super Admins possess inherent master access to all modules and configurations. Granular permissions are strictly used to restrict subordinate administrative roles.
              </p>
            </div>
          ) : (
            <form id="permissions-form" onSubmit={handleSubmit((data) => onSave(data.selectedPerms))}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {PERMISSION_GROUPS.map(group => {
                  const groupPermIds = group.permissions.map(p => p.id);
                  const isAllSelected = groupPermIds.every(id => selectedPerms.includes(id));

                  return (
                    <div key={group.category} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-dark)', borderRadius: 16, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                          {group.category}
                        </h4>
                        <button 
                          type="button" 
                          onClick={() => toggleGroup(groupPermIds)}
                          style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-yellow)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          {isAllSelected ? 'DESELECT ALL' : 'SELECT ALL'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                        {group.permissions.map(perm => {
                          const isSelected = selectedPerms.includes(perm.id);
                          const Icon = perm.type === 'view' ? Eye : perm.type === 'create' ? Plus : perm.type === 'edit' ? Edit3 : perm.type === 'delete' ? Trash2 : Link2;

                          return (
                            <label 
                              htmlFor={`perm-${perm.id}`}
                              key={perm.id} 
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', 
                                background: isSelected ? 'rgba(245, 197, 24, 0.08)' : 'var(--search-bg)', 
                                border: `1px solid ${isSelected ? 'var(--accent-yellow)' : 'var(--border-dark)'}`, 
                                borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                                opacity: isSelected ? 1 : 0.7
                              }}
                            >
                              <input 
                                id={`perm-${perm.id}`}
                                type="checkbox" 
                                value={perm.id}
                                {...register('selectedPerms')}
                                style={{ display: 'none' }}
                              />
                              <Icon size={14} color={isSelected ? 'var(--accent-yellow)' : 'var(--text-muted)'} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {perm.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isSuperAdmin && (
          <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border-dark)', display: 'flex', gap: 12, justifyContent: 'flex-end', background: 'rgba(0,0,0,0.02)' }}>
            <button type="button" onClick={onClose} className="outline-btn" style={{ padding: '10px 24px', borderRadius: 12 }}>Cancel</button>
            <button type="submit" form="permissions-form" className="primary-btn" style={{ padding: '10px 28px', borderRadius: 12, fontWeight: 800 }}>
              Update Security Matrix
            </button>
          </div>
        )}
      </div>
    </>
  );
}
