import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Users } from 'lucide-react';
import { User } from '@/services/user.service';
import { useQuery } from '@tanstack/react-query';
import { companyService, Company } from '@/services/company.service';

const userSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().or(z.literal('')),
  role: z.string().min(1, 'Role is required'),
  companyId: z.string().uuid('Please select a company').optional().or(z.literal('')),
});

type UserFormValues = z.infer<typeof userSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (data: Partial<User>) => void;
}

export default function UserModal({ isOpen, onClose, user, onSave }: Props) {
  const { data: companyData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies-all'],
    queryFn: () => companyService.getCompanies({ limit: 100 }),
    enabled: isOpen,
  });

  const [isCustomRole, setIsCustomRole] = useState(false);
  const companies: Company[] = Array.isArray(companyData) ? companyData : (companyData as any)?.data || [];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', role: 'COMPANY ADMIN', companyId: '' },
  });

  const currentRoleValue = watch('role');

  useEffect(() => {
    if (isOpen) {
      const presets = ['COMPANY ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'];
      const initialRole = user?.role || 'COMPANY ADMIN';
      const isCustom = !presets.includes(initialRole);
      
      setIsCustomRole(isCustom);
      reset({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: initialRole,
        companyId: user?.companyId || '',
      });
    }
  }, [isOpen, user, reset]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 100 }} 
        onClick={onClose} 
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border-dark)', 
        borderRadius: 16, width: '90%', maxWidth: 500, zIndex: 101,
        padding: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'modalZoom 0.2s ease forwards'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #ffe053 0%, #ffe053 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255,240,31,0.25)',
            }}>
              <Users size={18} color="#111827" />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', lineHeight: 1 }}>
              {user ? 'Edit Staff Profile' : 'Add New Staff'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>FIRST NAME</label>
              <input 
                {...register('firstName')}
                placeholder="e.g. John"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.firstName ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: 'var(--text-main)' }}
              />
              {errors.firstName && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.firstName.message}</span>}
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>LAST NAME</label>
              <input 
                {...register('lastName')}
                placeholder="e.g. Doe"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.lastName ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: 'var(--text-main)' }}
              />
              {errors.lastName && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.lastName.message}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
             <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>EMAIL</label>
              <input 
                {...register('email')}
                placeholder="john@company.com"
                disabled={!!user} // Email usually acts as unchangeable username
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.email ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: user ? 'var(--text-muted)' : 'var(--text-main)', cursor: user ? 'not-allowed' : 'text' }}
              />
              {errors.email && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.email.message}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>PHONE</label>
              <input 
                {...register('phone')}
                placeholder="+1 234 567 8900"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>ROLE</label>
              <select 
                value={isCustomRole ? 'CUSTOM' : currentRoleValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM') {
                    setIsCustomRole(true);
                    setValue('role', '');
                  } else {
                    setIsCustomRole(false);
                    setValue('role', val);
                  }
                }}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.role ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: 'var(--text-main)', appearance: 'none' }}
              >
                <option value="COMPANY ADMIN">Company Admin</option>
                <option value="EMPLOYEE">Generic Employee</option>
                <option value="SUPER_ADMIN">System Root (Super Admin)</option>
                <option value="CUSTOM">-- Custom Designation --</option>
              </select>
              {errors.role && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.role.message}</span>}
              
              {isCustomRole && (
                <div style={{ position: 'relative' }}>
                  <input 
                    placeholder="Type custom role name..."
                    {...register('role')} 
                    autoFocus
                    style={{ width: '100%', marginTop: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)' }}
                  />
                  <button 
                    type="button"
                    onClick={() => { setIsCustomRole(false); setValue('role', 'COMPANY ADMIN'); }}
                    style={{ position: 'absolute', right: 10, top: 18, background: 'transparent', border: 'none', color: 'var(--accent-red)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                  >
                    RESET
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, opacity: currentRoleValue === 'SUPER_ADMIN' ? 0.3 : 1, pointerEvents: currentRoleValue === 'SUPER_ADMIN' ? 'none' : 'auto' }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>ASSIGNED AFFILIATE</label>
              <select 
                {...register('companyId')}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.companyId ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: 'var(--text-main)', appearance: 'none' }}
              >
                <option value="">-- Select Company --</option>
                {!isLoadingCompanies && companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.companyId && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.companyId.message}</span>}
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--border-dark)' }}>
            <button type="button" onClick={onClose} className="outline-btn">Cancel</button>
            <button type="submit" className="primary-btn">Save Profile</button>
          </div>
        </form>
      </div>
    </>
  );
}
