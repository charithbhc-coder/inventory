import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Tag, Layers, Edit, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoryService } from '@/services/category.service';

interface CategoryModalProps {
  category: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessCallback?: (category: any) => void;
}

export default function CategoryModal({ category, isOpen, onClose, onSuccessCallback }: CategoryModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!category;

  const [isMainCategory, setIsMainCategory] = useState(category ? !category.parentCategoryId : true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [formData, setFormData] = useState({
    name: category?.name || '',
    code: category?.code || '',
    description: category?.description || '',
    parentCategoryId: category?.parentCategoryId || '',
  });

  // Reset form when modal opens with new data
  useEffect(() => {
    setFormData({
      name: category?.name || '',
      code: category?.code || '',
      description: category?.description || '',
      parentCategoryId: category?.parentCategoryId || '',
    });
    setIsMainCategory(category ? !category.parentCategoryId : true);
  }, [category, isOpen]);

  // Fetch all top-level categories (those without a parent) to use as parent options
  const { data: catData } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoryService.getCategories({ limit: 200 }),
    enabled: isOpen,
  });

  const allCategories: any[] = useMemo(() => {
    const raw = catData;
    if (Array.isArray(raw)) return raw;
    return (raw as any)?.data || (raw as any)?.items || [];
  }, [catData]);

  // Only top-level categories can be parents (no nesting beyond 2 levels)
  const parentOptions = allCategories.filter(c => !c.parentCategoryId && c.id !== category?.id);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        parentCategoryId: isMainCategory ? null : (data.parentCategoryId || null),
        code: data.code.toUpperCase(),
      };
      return isEdit
        ? (categoryService as any).updateCategory(category.id, payload)
        : (categoryService as any).createCategory(payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-all'] });
      toast.success(isEdit ? 'Category updated!' : 'Category created!');
      if (onSuccessCallback && res?.data) onSuccessCallback(res.data);
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Something went wrong'),
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error('Name and Code are required');
      return;
    }
    if (formData.code.length < 2 || formData.code.length > 6) {
      toast.error('Code must be 2–6 characters (e.g. LAP, CHR)');
      return;
    }
    mutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '20px'
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 520, background: 'var(--bg-card)',
        borderRadius: isMobile ? 0 : 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
        height: isMobile ? '100%' : 'auto', maxHeight: '100vh', display: 'flex', flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: 'clamp(16px, 5%, 24px) clamp(16px, 5%, 28px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #ffe053 0%, #ffe053 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255,240,31,0.25)',
            }}>
              {isEdit ? <Edit size={18} color="#111827" /> : <Tag size={18} color="#111827" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', lineHeight: 1 }}>
                {isEdit ? 'Edit Category' : 'New Category'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                Asset Classification System
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: isMobile ? '20px' : 'clamp(16px, 5%, 28px)', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Name */}
            <div>
              <label htmlFor="cat-name" style={s.label}>CATEGORY NAME <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <div style={s.inputWrap}>
                <Tag style={s.inputIcon} size={16} />
                <input
                  id="cat-name"
                  style={s.input}
                  placeholder="e.g. Laptop, Server, Desk Chair"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            {/* Code */}
            <div>
              <label htmlFor="cat-code" style={s.label}>
                CATEGORY CODE (PREFIX) <span style={{ color: 'var(--accent-red)' }}>*</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>2–6 chars, auto-uppercased</span>
              </label>
              <div style={s.inputWrap}>
                <Hash style={s.inputIcon} size={16} />
                <input
                  id="cat-code"
                  placeholder="e.g. LAP, SRV, DSK"
                  value={formData.code}
                  maxLength={6}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  style={s.input}
                />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Used in auto-generated barcodes: <strong>ACME-{formData.code || 'LAP'}-20250615-0042</strong>
              </p>
            </div>

            {/* Category Type Toggle */}
            <div>
              <label style={s.label}>CATEGORY HIERARCHY</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 12, width: 'fit-content' }}>
                <button 
                  type="button" 
                  onClick={() => setIsMainCategory(true)} 
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: isMainCategory ? 'var(--accent-yellow)' : 'transparent', color: isMainCategory ? '#111' : 'var(--text-muted)', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  Top-Level Group
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsMainCategory(false)} 
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: !isMainCategory ? 'var(--accent-yellow)' : 'transparent', color: !isMainCategory ? '#111' : 'var(--text-muted)', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  Sub-Category
                </button>
              </div>
            </div>

            {/* Parent Category (conditional) */}
            {!isMainCategory && (
              <div style={{ animation: 'fadeIn 0.2s ease forwards' }}>
                <label htmlFor="cat-parent" style={s.label}>PARENT GROUP <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                <div style={s.inputWrap}>
                  <Layers style={s.inputIcon} size={16} />
                  <select
                    id="cat-parent"
                    value={formData.parentCategoryId}
                    onChange={e => setFormData({ ...formData, parentCategoryId: e.target.value })}
                    style={{ ...s.input, borderColor: 'var(--accent-yellow)', boxShadow: '0 0 0 1px rgba(255, 224, 83, 0.2)' }}
                    required={!isMainCategory}
                  >
                    <option value="" disabled>Select parent group...</option>
                    {parentOptions.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  This category will be nested under the selected parent.
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="cat-desc" style={s.label}>DESCRIPTION</label>
              <textarea
                id="cat-desc"
                style={{ ...s.inputSimple, minHeight: 80, resize: 'none' }}
                placeholder="Brief description of this category..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column-reverse' : 'row',
            justifyContent: 'flex-end', 
            gap: 12, 
            marginTop: 28, 
            paddingTop: 20, 
            borderTop: '1px solid var(--border-dark)', 
            flexWrap: 'wrap' 
          }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="outline-btn" 
              style={{ padding: '10px 24px', minWidth: 100 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={mutation.isPending}
              style={{ padding: '10px 32px', fontWeight: 800, opacity: mutation.isPending ? 0.7 : 1 }}
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  label: { display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' } as React.CSSProperties,
  inputWrap: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute' as const, left: 14, color: 'var(--text-muted)' },
  input: {
    width: '100%', padding: '12px 14px 12px 42px',
    background: 'var(--bg-dark)', border: '1px solid var(--border-dark)',
    borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-main)',
    outline: 'none', transition: 'all 0.2s',
  } as React.CSSProperties,
  inputSimple: {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-dark)', border: '1px solid var(--border-dark)',
    borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-main)',
    outline: 'none',
  } as React.CSSProperties,
};
