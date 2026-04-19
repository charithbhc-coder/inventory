import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Network } from 'lucide-react';
import { Department } from '@/services/department.service';
import { useQuery } from '@tanstack/react-query';
import { companyService, Company } from '@/services/company.service';

const deptSchema = z.object({
  name:      z.string().min(2, 'Department name is required'),
  code:      z.string().min(1, 'Department code is required').max(10, 'Code max 10 chars').toUpperCase(),
  location:  z.string().optional().or(z.literal('')),
  companyId: z.string().min(1, 'Please select a company'),
});

type DeptFormValues = z.infer<typeof deptSchema>;

interface Props {
  isOpen:         boolean;
  onClose:        () => void;
  dept?:          Department | null;
  /** Pre-selected company – hides the company dropdown */
  fixedCompanyId?: string;
  onSave:         (data: DeptFormValues) => void;
  isSaving?:      boolean;
}

export default function DepartmentModal({ isOpen, onClose, dept, fixedCompanyId, onSave, isSaving }: Props) {
  /* Only load companies list when no fixed company is set */
  const { data: companyData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies-all'],
    queryFn:  () => companyService.getCompanies({ limit: 100 }),
    enabled:  isOpen && !fixedCompanyId,
  });
  const companies: Company[] = Array.isArray(companyData) ? companyData : (companyData as any)?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeptFormValues>({
    resolver:      zodResolver(deptSchema),
    defaultValues: { name: '', code: '', location: '', companyId: fixedCompanyId ?? '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name:      dept?.name     || '',
        code:      dept?.code     || '',
        location:  dept?.location || '',
        companyId: fixedCompanyId ?? dept?.companyId ?? '',
      });
    }
  }, [isOpen, dept, fixedCompanyId, reset]);

  if (!isOpen) return null;

  const isEdit = !!dept;

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1.5px solid ${hasError ? 'var(--accent-red)' : 'var(--border-dark)'}`,
    background: 'var(--search-bg)',
    color: 'var(--text-main)',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s',
  });

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 100 }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border-dark)',
        borderRadius: 16, width: '90%', maxWidth: 480, zIndex: 101,
        padding: 28, boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35)',
        animation: 'modalZoom 0.2s ease forwards',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #ffe053 0%, #ffe053 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255,240,31,0.25)',
            }}>
              <Network size={18} color="#111827" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', lineHeight: 1 }}>
                {isEdit ? 'Edit Department' : 'New Department'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Company selector – hidden when a fixed company is provided */}
          {!fixedCompanyId && (
            <div>
              <label htmlFor="dept-company" style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                COMPANY
              </label>
              <select
                id="dept-company"
                {...register('companyId')}
                disabled={isEdit}
                style={{ ...inputStyle(!!errors.companyId), appearance: 'none', cursor: isEdit ? 'not-allowed' : 'pointer', opacity: isEdit ? 0.5 : 1 }}
              >
                <option value="">— Select Company —</option>
                {!isLoadingCompanies && companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.companyId && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.companyId.message}</span>}
            </div>
          )}

          {/* Name + Code row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="dept-name" style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                DEPARTMENT NAME
              </label>
              <input
                id="dept-name"
                {...register('name')}
                placeholder="e.g. Human Resources"
                style={inputStyle(!!errors.name)}
              />
              {errors.name && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.name.message}</span>}
            </div>
            <div>
              <label htmlFor="dept-code" style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                CODE
              </label>
              <input
                id="dept-code"
                {...register('code')}
                placeholder="HR"
                style={{
                  ...inputStyle(!!errors.code),
                  textTransform: 'uppercase'
                }}
              />
              {errors.code && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.code.message}</span>}
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="dept-location" style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              LOCATION <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              id="dept-location"
              {...register('location')}
              placeholder="e.g. Floor 2, Building A"
              style={inputStyle(false)}
            />
          </div>

          {/* Actions */}
          <div style={{ marginTop: 8, display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--border-dark)' }}>
            <button type="button" onClick={onClose} className="outline-btn">Cancel</button>
            <button type="submit" className="primary-btn" disabled={isSaving}>
              {isSaving ? 'Saving…' : isEdit ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
