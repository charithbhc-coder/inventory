import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UserPlus, Building, User, Info, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';
import { departmentService } from '@/services/department.service';

interface AssignModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignModal({ item, isOpen, onClose }: AssignModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    departmentId: item.departmentId || '',
    assignedToName: item.assignedToName || '',
    assignedToEmployeeId: item.assignedToEmployeeId || '',
    notes: ''
  });

  // Autocomplete state — ID field
  const [idSuggestions, setIdSuggestions] = useState<{ name: string; employeeId: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete state — Name field
  const [nameSuggestions, setNameSuggestions] = useState<{ name: string; employeeId: string }[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const nameDropdownRef = useRef<HTMLDivElement>(null);

  const { data: departmentsRes } = useQuery({
    queryKey: ['departments', item.companyId],
    queryFn: () => departmentService.getDepartments(item.companyId),
    enabled: isOpen
  });

  // Load all currently/previously assigned employees (IN_USE items with an assignedToEmployeeId)
  const { data: assignedItemsData } = useQuery({
    queryKey: ['employee-lookup', item.companyId],
    queryFn: () => itemService.getItems({ status: 'IN_USE', companyId: item.companyId, limit: 500 }),
    enabled: isOpen,
  });

  // Deduplicated employee list from assigned items
  const knownEmployees = useMemo(() => {
    const raw = Array.isArray(assignedItemsData) ? assignedItemsData : (assignedItemsData as any)?.data || [];
    const map = new Map<string, { name: string; employeeId: string }>();
    (raw as Item[]).forEach(i => {
      if (i.assignedToEmployeeId && i.assignedToName) {
        map.set(i.assignedToEmployeeId.toLowerCase(), {
          name: i.assignedToName,
          employeeId: i.assignedToEmployeeId,
        });
      }
    });
    return Array.from(map.values());
  }, [assignedItemsData]);

  const departmentsList = Array.isArray(departmentsRes) ? departmentsRes : (departmentsRes as any)?.data || [];

  const mutation = useMutation({
    mutationFn: (dto: any) => itemService.assignItem(item.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['item-timeline', item.id] });
      toast.success(item.assignedToName ? 'Assignment updated successfully' : 'Asset assigned successfully');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to assign asset')
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // Filter suggestions as Employee ID is typed
  const handleEmployeeIdChange = (val: string) => {
    setFormData(prev => ({ ...prev, assignedToEmployeeId: val }));
    if (val.trim().length > 0) {
      const matches = knownEmployees.filter(e =>
        e.employeeId.toLowerCase().includes(val.toLowerCase())
      );
      setIdSuggestions(matches);
      setShowDropdown(matches.length > 0);
    } else {
      setIdSuggestions([]);
      setShowDropdown(false);
    }
  };

  // When user selects a suggestion → auto-fill name
  const selectEmployee = (emp: { name: string; employeeId: string }) => {
    setFormData(prev => ({
      ...prev,
      assignedToEmployeeId: emp.employeeId,
      assignedToName: emp.name,
    }));
    setShowDropdown(false);
    setIdSuggestions([]);
  };

  // Handle name field typing → filter by name
  const handleNameChange = (val: string) => {
    setFormData(prev => ({ ...prev, assignedToName: val }));
    if (val.trim().length > 0) {
      const matches = knownEmployees.filter(e =>
        e.name.toLowerCase().includes(val.toLowerCase())
      );
      setNameSuggestions(matches);
      setShowNameDropdown(matches.length > 0);
    } else {
      setNameSuggestions([]);
      setShowNameDropdown(false);
    }
  };

  // Close both dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div className="modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconBox}><UserPlus size={20} /></div>
            <div>
              <h3 style={styles.title}>{item.assignedToName ? 'Edit Assignment' : 'Assign Asset'}</h3>
              <p style={styles.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Department */}
            <div>
              <label style={styles.label}>DEPARTMENT / WING</label>
              <div style={styles.inputWrap}>
                <Building style={styles.inputIcon} size={16} />
                <select
                  style={styles.input}
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                  required
                >
                  <option value="">Select Department...</option>
                  {departmentsList.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} size={14} color="var(--color-text-muted)" />
              </div>
            </div>

            {/* Employee ID (with autocomplete) FIRST, then Name */}
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Employee ID — with dropdown */}
              <div style={{ flex: 1 }}>
                <label style={styles.label}>EMPLOYEE ID</label>
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <div style={styles.inputWrap}>
                    <Info style={styles.inputIcon} size={16} />
                    <input
                      ref={idInputRef}
                      style={styles.input}
                      placeholder="Type ID to search or enter new..."
                      value={formData.assignedToEmployeeId}
                      onChange={e => handleEmployeeIdChange(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  {/* Autocomplete Dropdown */}
                  {showDropdown && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      zIndex: 200, overflow: 'hidden', maxHeight: 200, overflowY: 'auto'
                    }}>
                      {idSuggestions.map(emp => (
                        <button
                          key={emp.employeeId}
                          type="button"
                          onMouseDown={() => selectEmployee(emp)} // mousedown fires before blur
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '10px 14px', background: 'transparent',
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            borderBottom: '1px solid var(--color-border)',
                            transition: 'background 0.15s'
                          }}
                          className="assign-suggestion-btn"
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 13
                          }}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{emp.name}</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-accent)', fontWeight: 700, marginTop: 1 }}>#{emp.employeeId}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {knownEmployees.length > 0 && (
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 5, fontWeight: 500 }}>
                    {knownEmployees.length} known employee{knownEmployees.length !== 1 ? 's' : ''} in this company
                  </p>
                )}
              </div>

              {/* Employee Name — autocomplete by name, auto-fills ID */}
              <div style={{ flex: 1 }}>
                <label style={styles.label}>ASSIGNED TO (NAME)</label>
                <div style={{ position: 'relative' }} ref={nameDropdownRef}>
                  <div style={styles.inputWrap}>
                    <User style={styles.inputIcon} size={16} />
                    <input
                      style={{
                        ...styles.input,
                        background: formData.assignedToName && formData.assignedToEmployeeId &&
                          knownEmployees.some(e => e.employeeId === formData.assignedToEmployeeId)
                          ? 'rgba(59,130,246,0.05)'
                          : 'var(--color-surface-2)',
                      }}
                      placeholder="Type name to search..."
                      value={formData.assignedToName}
                      onChange={e => handleNameChange(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  {showNameDropdown && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      zIndex: 200, overflow: 'hidden', maxHeight: 200, overflowY: 'auto'
                    }}>
                      {nameSuggestions.map(emp => (
                        <button
                          key={emp.employeeId}
                          type="button"
                          onMouseDown={() => selectEmployee(emp)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '10px 14px', background: 'transparent',
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            borderBottom: '1px solid var(--color-border)',
                            transition: 'background 0.15s'
                          }}
                          className="assign-suggestion-btn"
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 13
                          }}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{emp.name}</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-accent)', fontWeight: 700, marginTop: 1 }}>#{emp.employeeId}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={styles.label}>ASSIGNMENT NOTES</label>
              <textarea
                style={styles.textarea}
                placeholder="Any specific instructions or context..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={mutation.isPending}
              style={{ minWidth: 160 }}
            >
              {mutation.isPending ? (item.assignedToName ? 'Updating...' : 'Assigning...') : (item.assignedToName ? 'Update Assignment' : 'Confirm Assignment')}
            </button>
          </div>
        </form>

        <style>{`
          .assign-suggestion-btn:hover {
            background: rgba(255, 224, 83, 0.06) !important;
          }
        `}</style>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1100
  },
  modal: {
    width: '100%', maxWidth: 520, background: 'var(--color-surface)',
    borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)'
  },
  header: {
    padding: '20px 24px', background: 'var(--color-sidebar)', color: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 197, 24, 0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)'
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  form: { padding: 24 },
  label: { display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: '0.05em' },
  inputWrap: { position: 'relative' as const },
  inputIcon: { position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' },
  input: {
    width: '100%', padding: '12px 14px 12px 42px', background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13,
    color: 'var(--color-text-primary)', outline: 'none', appearance: 'none' as const
  },
  textarea: {
    width: '100%', padding: 12, background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13,
    color: 'var(--color-text-primary)', outline: 'none', minHeight: 80, resize: 'none' as const
  },
  footer: { marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }
};
