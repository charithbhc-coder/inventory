import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Key } from 'lucide-react';
import { License } from '@/services/license.service';

const licenseSchema = z.object({
  softwareName: z.string().min(2, 'Software name is required'),
  vendor: z.string().min(2, 'Vendor is required'),
  licenseKey: z.string().nullish().or(z.literal('')),
  purchaseDate: z.string().nullish().or(z.literal('')),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  maxUsers: z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)))
    .pipe(z.number().positive('Must be a positive number').optional()),
  contactEmail: z.string().email('Invalid email').nullish().or(z.literal('')),
  category: z.string().nullish().or(z.literal('')),
  notes: z.string().nullish().or(z.literal('')),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  license?: License | null;
  onSave: (data: Partial<License>) => void;
}

export default function LicenseModal({ isOpen, onClose, license, onSave }: Props) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      softwareName: '',
      vendor: '',
      licenseKey: '',
      purchaseDate: '',
      expiryDate: '',
      maxUsers: undefined,
      contactEmail: '',
      category: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        softwareName: license?.softwareName || '',
        vendor: license?.vendor || '',
        licenseKey: license?.licenseKey || '',
        purchaseDate: license?.purchaseDate ? license.purchaseDate.split('T')[0] : '',
        expiryDate: license?.expiryDate ? license.expiryDate.split('T')[0] : '',
        maxUsers: license?.maxUsers || undefined,
        contactEmail: license?.contactEmail || '',
        category: license?.category || '',
        notes: license?.notes || '',
      });
    }
  }, [isOpen, license, reset]);

  if (!isOpen) return null;

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${hasError ? 'var(--accent-red)' : 'var(--border-dark)'}`,
    background: 'var(--search-bg)',
    color: 'var(--text-main)',
  });

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 100 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border-dark)',
        borderRadius: 16, width: isMobile ? '100%' : '90%', maxWidth: 640, zIndex: 101,
        padding: isMobile ? 16 : 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'modalZoom 0.2s ease forwards',
        maxHeight: isMobile ? '100vh' : '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
            }}>
              <Key size={18} color="#ffffff" />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', lineHeight: 1 }}>
              {license ? 'Edit Software License' : 'Add New License'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave as any)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1: Software Name + Vendor */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SOFTWARE NAME *</label>
              <input
                {...register('softwareName')}
                placeholder="e.g. AWS Business Support"
                style={inputStyle(!!errors.softwareName)}
              />
              {errors.softwareName && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.softwareName.message}</span>}
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>VENDOR *</label>
              <input
                {...register('vendor')}
                placeholder="e.g. Amazon Web Services"
                style={inputStyle(!!errors.vendor)}
              />
              {errors.vendor && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.vendor.message}</span>}
            </div>
          </div>

          {/* Row 2: License Key */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>LICENSE KEY (OPTIONAL)</label>
            <input
              {...register('licenseKey')}
              placeholder="XXXX-YYYY-ZZZZ-1234"
              style={inputStyle(!!errors.licenseKey)}
            />
          </div>

          {/* Row 3: Purchase Date + Expiry Date */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>PURCHASE DATE</label>
              <input
                type="date"
                {...register('purchaseDate')}
                style={inputStyle(false)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>EXPIRY DATE *</label>
              <input
                type="date"
                {...register('expiryDate')}
                style={inputStyle(!!errors.expiryDate)}
              />
              {errors.expiryDate && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.expiryDate.message}</span>}
            </div>
          </div>

          {/* Row 4: Max Users + Category */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>MAX USERS / SEATS</label>
              <input
                type="number"
                {...register('maxUsers')}
                placeholder="e.g. 50 (Optional)"
                style={inputStyle(!!errors.maxUsers)}
              />
              {errors.maxUsers && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.maxUsers.message}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CATEGORY</label>
              <input
                {...register('category')}
                placeholder="e.g. Security, Cloud"
                style={inputStyle(false)}
              />
            </div>
          </div>

          {/* Row 5: Contact Email */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CONTACT EMAIL (FOR NOTIFICATIONS)</label>
            <input
              {...register('contactEmail')}
              placeholder="e.g. it-admin@company.com"
              style={inputStyle(!!errors.contactEmail)}
            />
            {errors.contactEmail && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.contactEmail.message}</span>}
          </div>

          {/* Row 6: Notes */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>NOTES</label>
            <textarea
              {...register('notes')}
              placeholder="Additional details..."
              rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--search-bg)', color: 'var(--text-main)', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: 12, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--border-dark)' }}>
            <button type="button" onClick={onClose} className="outline-btn" style={{ width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center' }}>Cancel</button>
            <button type="submit" className="primary-btn" style={{ width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center' }}>Save Changes</button>
          </div>
        </form>
      </div>
    </>
  );
}
