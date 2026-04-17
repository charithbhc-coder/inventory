import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Building2 } from 'lucide-react';
import { Company } from '@/services/company.service';

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company?: Company | null;
  onSave: (data: Partial<Company>) => void;
}

export default function CompanyModal({ isOpen, onClose, company, onSave }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: '', code: '', email: '', phone: '', address: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset(company || { name: '', code: '', email: '', phone: '', address: '' });
    }
  }, [isOpen, company, reset]);

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
              <Building2 size={18} color="#111827" />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', lineHeight: 1 }}>
              {company ? 'Edit Subsidiary' : 'Add New Subsidiary'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>COMPANY NAME</label>
            <input 
              {...register('name')}
              placeholder="e.g. Acme Corp"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.name ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: 'var(--text-main)' }}
            />
            {errors.name && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.name.message}</span>}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>COMPANY CODE</label>
            <input 
              {...register('code')}
              placeholder="e.g. ACM"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.code ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: 'var(--text-main)', textTransform: 'uppercase' }}
            />
            {errors.code && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.code.message}</span>}
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
             <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>EMAIL</label>
              <input 
                {...register('email')}
                placeholder="contact@company.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${errors.email ? 'var(--accent-red)' : 'var(--border-dark)'}`, background: 'var(--search-bg)', color: 'var(--text-main)' }}
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

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>ADDRESS (OPTIONAL)</label>
            <textarea 
              {...register('address')}
              placeholder="123 Corporate Blvd&#10;Suite 400&#10;City, State 12345"
              rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--border-dark)' }}>
            <button type="button" onClick={onClose} className="outline-btn">Cancel</button>
            <button type="submit" className="primary-btn">Save Company</button>
          </div>
        </form>
      </div>
    </>
  );
}
