import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '@/services/company.service';
import { ArrowLeft, UploadCloud, MapPin, Mail, Phone, Edit } from 'lucide-react';
import CompanyModal from './CompanyModal';
import { getUploadUrl } from '@/lib/config';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyService.getCompany(id!),
    enabled: !!id,
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => companyService.uploadLogo(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => companyService.updateCompany(id!, payload),
    onSuccess: (updatedCompany) => {
      queryClient.setQueryData(['company', id], updatedCompany);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsEditModalOpen(false);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadLogoMutation.mutate(e.target.files[0]);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading repository...</div>;
  }

  if (!company) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Company not found.</p>
        <button className="outline-btn" onClick={() => navigate('/companies')} style={{ marginTop: 16 }}>Go Back</button>
      </div>
    );
  }

  const logoUrlStr = company.logoUrl ? getUploadUrl(company.logoUrl) : null;

  return (
    <div style={{ padding: '0 0 40px' }} className="company-detail-responsive">
      <style>{`
        .company-detail-responsive {
          max-width: 1200px;
          margin: 0 auto;
        }
        .detail-header {
          display: flex; 
          align-items: center; 
          gap: 16px; 
          margin-bottom: 32px;
        }
        .profile-card {
          padding: 32px;
          text-align: center;
        }
        .profile-grid {
          text-align: left;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .profile-logo {
          width: 140px;
          height: 140px;
        }

        @media (max-width: 768px) {
          .detail-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .header-actions {
            margin-left: 0 !important;
            width: 100%;
          }
          .header-actions button {
            width: 100%;
          }
          .profile-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .grid-span-2 {
            grid-column: span 1 !important;
          }
          .profile-card {
            padding: 24px 16px;
          }
          .profile-logo {
            width: 120px;
            height: 120px;
          }
        }
      `}</style>
      
      <header className="detail-header">
        <button 
          onClick={() => navigate('/companies')}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {company.name}
            {company.isActive ? (
              <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 10, fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', letterSpacing: '0.5px', marginTop: 2 }}>ACTIVE</span>
            ) : (
              <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 10, fontWeight: 700, background: 'var(--timeline-danger-bg)', color: 'var(--accent-red)', letterSpacing: '0.5px', marginTop: 2 }}>INACTIVE</span>
            )}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px' }}>CODE: <span style={{ color: 'var(--text-main)' }}>{company.code}</span></p>
        </div>
        <div style={{ marginLeft: 'auto' }} className="header-actions">
           <button className="primary-btn" onClick={() => setIsEditModalOpen(true)}>
             <Edit size={14} /> Edit Info
           </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
        {/* Centered Profile Card */}
        <div style={{ gridColumn: 'span 12', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <div className="dark-card profile-card">
            <div 
              onClick={handleLogoClick}
              className="profile-logo"
              style={{ 
                margin: '0 auto 28px', borderRadius: '50%', 
                background: 'var(--search-bg)', border: '2px dashed var(--border-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s', ...(uploadLogoMutation.isPending && { opacity: 0.5 }),
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-yellow)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-dark)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {logoUrlStr ? (
                <img src={logoUrlStr} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <UploadCloud size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>UPLOAD LOGO</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>

            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>Business Profile</h2>
            
            <div className="profile-grid">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: 'var(--search-bg)', padding: 10, borderRadius: 10, color: 'var(--text-muted)', border: '1px solid var(--border-dark)' }}><Mail size={18} /></div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.5px' }}>EMAIL</div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{company.email || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: 'var(--search-bg)', padding: 10, borderRadius: 10, color: 'var(--text-muted)', border: '1px solid var(--border-dark)' }}><Phone size={18} /></div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.5px' }}>PHONE</div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{company.phone || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }} className="grid-span-2">
                <div style={{ background: 'var(--search-bg)', padding: 10, borderRadius: 10, color: 'var(--text-muted)', border: '1px solid var(--border-dark)' }}><MapPin size={18} /></div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.5px' }}>ADDRESS</div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{company.address || '—'}</div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <CompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
        onSave={(data) => {
          const { code, id, createdAt, updatedAt, logoUrl, isActive, ...safePayload } = data as any;
          updateMutation.mutate(safePayload);
        }}
      />
    </div>
  );
}
