import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, PackageSearch, Package, ShieldCheck, Info, Cpu, Globe, Calendar, BadgeDollarSign, Edit, Building, UploadCloud, Plus, CheckCircle2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemService, Item } from '@/services/item.service';
import { companyService } from '@/services/company.service';
import { categoryService } from '@/services/category.service';
import { departmentService } from '@/services/department.service';
import CategoryModal from '../categories/CategoryModal';

interface ItemModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ItemModal({ item, isOpen, onClose }: ItemModalProps) {
  const queryClient = useQueryClient();
  const [lastCreatedItem, setLastCreatedItem] = useState<any | null>(null);
  const isEdit = !!item;

  const [formData, setFormData] = useState({
    name: item?.name || '',
    categoryId: item?.categoryId || '',
    companyId: item?.companyId || '',
    departmentId: item?.departmentId || '',
    serialNumber: item?.serialNumber || '',
    condition: item?.condition || 'NEW',
    purchasePrice: item?.purchasePrice || '',
    purchaseDate: item?.purchaseDate?.split('T')[0] || '',
    purchasedFrom: item?.purchasedFrom || '',
    warrantyExpiresAt: item?.warrantyExpiresAt?.split('T')[0] || '',
    remarks: item?.remarks || '',
    parentItemId: item?.parentItemId || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: item?.name || '',
        categoryId: item?.categoryId || '',
        companyId: item?.companyId || '',
        departmentId: item?.departmentId || '',
        serialNumber: item?.serialNumber || '',
        condition: item?.condition || 'NEW',
        purchasePrice: item?.purchasePrice || '',
        purchaseDate: item?.purchaseDate?.split('T')[0] || '',
        purchasedFrom: item?.purchasedFrom || '',
        warrantyExpiresAt: item?.warrantyExpiresAt?.split('T')[0] || '',
        remarks: item?.remarks || '',
        parentItemId: item?.parentItemId || '',
      });
      // Reset files on open/switch
      setWarrantyFile(null);
      setInvoiceFile(null);
      setItemFile(null);
      setLastCreatedItem(null);
    }
  }, [item, isOpen]);



  const [previewBarcode, setPreviewBarcode] = useState<string>('');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // File states
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [itemFile, setItemFile] = useState<File | null>(null);

  const { data: companies = [] } = useQuery({ queryKey: ['companies', 'active'], queryFn: () => companyService.getCompanies() });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.getCategories() });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', formData.companyId],
    queryFn: () => departmentService.getDepartments(formData.companyId),
    enabled: !!formData.companyId
  });

  const { data: companyItems = [] } = useQuery({
    queryKey: ['items', 'company', formData.companyId],
    queryFn: () => itemService.getItems({ companyId: formData.companyId, limit: 500 }),
    enabled: isEdit && !!formData.companyId
  });

  const companiesList = useMemo(() => Array.isArray(companies) ? companies : (companies as any)?.data || [], [companies]);
  const categoriesList = useMemo(() => {
    const raw = Array.isArray(categories) ? categories : (categories as any)?.data || [];
    // Show active categories, plus the currently selected one (in case it's archived)
    return raw.filter((c: any) => c.isActive !== false || c.id === formData.categoryId);
  }, [categories, formData.categoryId]);
  const departmentsList = useMemo(() => Array.isArray(departments) ? departments : (departments as any)?.data || [], [departments]);
  const itemsList = useMemo(() => Array.isArray(companyItems) ? companyItems : (companyItems as any)?.data || (companyItems as any)?.items || [], [companyItems]);

  const { data: barcodeRes } = useQuery({
    queryKey: ['barcode-preview', formData.companyId, formData.categoryId],
    queryFn: () => itemService.previewBarcode(formData.companyId, formData.categoryId),
    enabled: !!formData.companyId && !!formData.categoryId && !isEdit
  });

  useEffect(() => {
    if (barcodeRes) setPreviewBarcode(barcodeRes?.code || barcodeRes);
  }, [barcodeRes]);

  const uploadMutation = useMutation({
    mutationFn: async ({ id, type, file }: { id: string, type: 'warranty' | 'invoice' | 'image', file: File }) => {
      if (type === 'warranty') return itemService.uploadWarranty(id, file);
      if (type === 'invoice') return itemService.uploadInvoice(id, file);
      if (type === 'image') return itemService.uploadImage(id, file);
    }
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? itemService.updateItem(item.id, data) : itemService.createItem(data),
    onSuccess: async (createdItem: any) => {
      const itemId = isEdit ? item.id : (createdItem?.id || createdItem?.data?.id);

      // Handle file uploads seamlessly
      if (itemId) {
        try {
          if (warrantyFile) await uploadMutation.mutateAsync({ id: itemId, type: 'warranty', file: warrantyFile });
          if (invoiceFile) await uploadMutation.mutateAsync({ id: itemId, type: 'invoice', file: invoiceFile });
          if (itemFile) await uploadMutation.mutateAsync({ id: itemId, type: 'image', file: itemFile });
        } catch (uploadErr: any) {
          const detail = uploadErr.response?.data?.message || 'Check file size or type.';
          toast.error(`Item saved, but upload failed: ${detail}`);
          console.error(uploadErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(isEdit ? 'Asset updated successfully' : 'Asset created successfully');
      
      if (!isEdit) {
        setLastCreatedItem(createdItem?.data || createdItem);
      } else {
        onClose();
      }

      setWarrantyFile(null);
      setInvoiceFile(null);
      setItemFile(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Something went wrong'),
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.companyId || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }
    const payload = {
      ...formData,
      serialNumber: formData.serialNumber || undefined,
      departmentId: formData.departmentId || undefined,
      parentItemId: formData.parentItemId || undefined,
      purchasePrice: formData.purchasePrice !== '' ? formData.purchasePrice : undefined
    };

    // If editing, remove immutable/special fields that are handled by other endpoints
    if (isEdit) {
      delete (payload as any).companyId;
      delete (payload as any).departmentId;
    }

    mutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '20px'
    }}>
      <div className="modal" style={{
        width: '100%', maxWidth: 850, background: 'var(--bg-card)',
        borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Header Section */}
        <div style={{
          padding: '20px 32px',
          background: 'var(--bg-sidebar)',
          color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: '#ffe053',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1b475d', border: '1px solid rgba(255, 224, 83, 0.3)'
            }}>
              {isEdit ? <Edit size={24} /> : <PackageSearch size={24} />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {isEdit ? 'Modify Asset' : 'Register New Asset'}
              </h2>
              <p style={{ margin: '2px 0 0', opacity: 0.6, fontSize: 12, fontWeight: 500 }}>
                Inventory Intake Management
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', opacity: 0.5, transition: 'opacity 0.2s' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '32px' }}>
          {lastCreatedItem ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 400, textAlign: 'center', gap: 24, animation: 'fadeIn 0.4s ease-out'
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981'
              }}>
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-main)', margin: '0 0 8px' }}>Registration Complete</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
                  Asset <strong>{lastCreatedItem.name}</strong> has been successfully added to the global inventory.
                </p>
              </div>

              <div style={{ 
                background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', 
                padding: '24px 40px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12,
                width: '100%', maxWidth: 300
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>ASSIGNED BARCODE</div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-main)', letterSpacing: '2px' }}>
                  {lastCreatedItem.barcode}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <button
                  onClick={() => itemService.printLabel(lastCreatedItem.id)}
                  className="primary-btn"
                  style={{ padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}
                >
                  <Printer size={18} />
                  Print Label (PDF)
                </button>
                <button
                  onClick={onClose}
                  className="outline-btn"
                  style={{ padding: '14px 28px', fontWeight: 700 }}
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <form id="item-form" onSubmit={handleSubmit}>
              {/* ... existing form content ... */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>

              {/* Left Column: Basic Info */}
              <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <label htmlFor="item-name" style={styles.label}>ASSET NAME <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <div style={styles.inputWrap}>
                    <Package style={styles.inputIcon} size={16} />
                    <input
                      id="item-name"
                      style={styles.input}
                      placeholder="e.g. Dell Latitude 5540"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label htmlFor="item-category" style={{ ...styles.label, marginBottom: 0 }}>CATEGORY <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                      <button 
                        type="button" 
                        onClick={() => setIsCategoryModalOpen(true)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-new-btn)', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Plus size={12} strokeWidth={3} /> NEW
                      </button>
                    </div>
                    <div style={styles.inputWrap}>
                      <Cpu style={styles.inputIcon} size={16} />
                      <select
                        id="item-category"
                        style={styles.input}
                        value={formData.categoryId}
                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                      >
                        <option value="">Select Category</option>
                        {categoriesList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {isEdit && (
                    <div style={{ flex: '1 1 150px' }}>
                      <label htmlFor="item-condition" style={styles.label}>CONDITION</label>
                      <div style={styles.inputWrap}>
                        <ShieldCheck style={styles.inputIcon} size={16} />
                        <select
                          id="item-condition"
                          style={styles.input}
                          value={formData.condition}
                          onChange={e => setFormData({ ...formData, condition: e.target.value })}
                        >
                          <option value="NEW">New (Boxed)</option>
                          <option value="GOOD">Good / Used</option>
                          <option value="FAIR">Fair (Shows Wear)</option>
                          <option value="DAMAGED">Damaged</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="item-company" style={styles.label}>COMPANY SUBSIDIARY <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <div style={styles.inputWrap}>
                    <Globe style={styles.inputIcon} size={16} />
                    <select
                      id="item-company"
                      style={styles.input}
                      value={formData.companyId}
                      onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                    >
                      <option value="">Select Subsidiary</option>
                      {companiesList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="item-department" style={styles.label}>DEPARTMENT / WING</label>
                  <div style={styles.inputWrap}>
                    <Building style={styles.inputIcon} size={16} />
                    <select
                      id="item-department"
                      style={styles.input}
                      value={formData.departmentId}
                      onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                      disabled={!formData.companyId}
                    >
                      <option value="">Select Department</option>
                      {departmentsList.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <label htmlFor="item-serial" style={styles.label} title="Manufacturer unique hardware tracking number">SERIAL NUMBER</label>
                    <input
                      id="item-serial"
                      style={styles.inputSimple}
                      placeholder="e.g. SN-12003X"
                      value={formData.serialNumber}
                      onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <label htmlFor="item-price" style={styles.label}>PURCHASE PRICE (LKR)</label>
                    <div style={styles.inputWrap}>
                      <BadgeDollarSign style={styles.inputIcon} size={16} />
                      <input
                        id="item-price"
                        type="number"
                        className="hide-spinners"
                        min="0"
                        step="0.01"
                        style={styles.input}
                        placeholder="0.00"
                        value={formData.purchasePrice}
                        onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="item-remarks" style={styles.label}>REMARKS</label>
                  <textarea
                    id="item-remarks"
                    style={{ ...styles.inputSimple, flex: 1, minHeight: 80, resize: 'none', padding: '12px' }}
                    placeholder="Remarks..."
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>
              </div>

              {/* Right Column: Identification & Metadata */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Barcode Preview Box */}
                {!isEdit && (
                  <div style={{
                    background: 'var(--bg-dark)',
                    border: '2px dashed var(--border-dark)',
                    borderRadius: 16, padding: 24, textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>AUTO-GENERATED BARCODE</div>
                    <div style={{
                      height: 60, width: '100%', background: 'var(--bg-card)', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'monospace', fontSize: 18, fontWeight: 900,
                      letterSpacing: '0.2em', color: 'var(--text-main)', border: '1px solid var(--border-dark)'
                    }}>
                      {previewBarcode || 'PENDING...'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Info size={14} color="var(--accent-yellow)" />
                      Valid unique ID for this asset
                    </div>
                  </div>
                )}
                {isEdit && (
                  <div style={{
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: 16, padding: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>ASSET BARCODE</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: 'var(--text-main)' }}>{item?.barcode}</div>
                    </div>
                  </div>
                )}

                {/* Parent Asset (Edit Mode Only) */}
                {isEdit && (
                  <div style={{ padding: '0 4px' }}>
                    <label htmlFor="item-parent" style={styles.label}>
                      PARENT ASSET
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 500, textTransform: 'none' }}>(e.g. Install RAM in a Server)</span>
                    </label>
                    <div style={styles.inputWrap}>
                      <Package style={styles.inputIcon} size={16} />
                      <select
                        id="item-parent"
                        style={styles.input}
                        value={formData.parentItemId}
                        onChange={e => setFormData({ ...formData, parentItemId: e.target.value })}
                      >
                        <option value="">— No Parent Asset —</option>
                        {itemsList.filter((i: any) => i.id !== item?.id).map((i: any) => (
                          <option key={i.id} value={i.id}>{i.barcode} - {i.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 120px' }}>
                    <label htmlFor="item-purchase-date" style={styles.label}>PURCHASE DATE</label>
                    <div style={styles.inputWrap}>
                      <Calendar style={styles.inputIcon} size={16} />
                      <input
                        id="item-purchase-date"
                        type="date"
                        style={styles.input}
                        value={formData.purchaseDate}
                        onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ flex: '1 1 120px' }}>
                    <label htmlFor="item-warranty" style={styles.label}>WARRANTY EXPIRES</label>
                    <div style={styles.inputWrap}>
                      <ShieldCheck style={styles.inputIcon} size={16} />
                      <input
                        id="item-warranty"
                        type="date"
                        style={styles.input}
                        value={formData.warrantyExpiresAt}
                        onChange={e => setFormData({ ...formData, warrantyExpiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>ATTACHMENTS & PHOTO</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ ...styles.fileUploadBtn, background: itemFile ? 'rgba(255, 224, 83, 0.1)' : 'var(--bg-dark)' }}>
                      <Plus size={16} color="var(--accent-yellow)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {itemFile ? itemFile.name : 'Upload Item Photo / Capture'}
                      </span>
                      <input type="file" style={{ display: 'none' }} accept="image/*" capture="environment" onChange={e => e.target.files && setItemFile(e.target.files[0])} />
                    </label>
                    
                    <label style={styles.fileUploadBtn}>
                      <UploadCloud size={16} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {invoiceFile ? invoiceFile.name : 'Upload Purchase Invoice'}
                      </span>
                      <input type="file" style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" onChange={e => e.target.files && setInvoiceFile(e.target.files[0])} />
                    </label>
                    
                    <label style={styles.fileUploadBtn}>
                      <UploadCloud size={16} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {warrantyFile ? warrantyFile.name : 'Upload Warranty Document'}
                      </span>
                      <input type="file" style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" onChange={e => e.target.files && setWarrantyFile(e.target.files[0])} />
                    </label>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>* Files will be uploaded automatically on save.</div>
                  </div>
                </div>
              </div>
            </div>
          </form>
          )}
        </div>

        {/* Footer actions */}
        {!lastCreatedItem && (
          <div style={{
            padding: '20px 32px',
            borderTop: '1px solid var(--border-dark)',
            display: 'flex', justifyContent: 'flex-end', gap: 16,
            background: 'var(--bg-card)',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={onClose}
              className="outline-btn"
              style={{ padding: '10px 24px', fontWeight: 600 }}
            >
              Discard
            </button>
            <button
              type="submit"
              form="item-form"
              className="primary-btn"
              style={{
                padding: '10px 32px',
                fontWeight: 800, cursor: mutation.isPending ? 'default' : 'pointer',
                opacity: mutation.isPending ? 0.7 : 1
              }}
              disabled={mutation.isPending || uploadMutation.isPending}
            >
              {mutation.isPending || uploadMutation.isPending ? 'Processing...' : isEdit ? 'Save Changes' : 'Confirm Intake'}
            </button>
          </div>
        )}
      </div>
      {isCategoryModalOpen && (
        <div style={{ position: 'absolute', zIndex: 200 }}>
          <CategoryModal 
            isOpen={isCategoryModalOpen} 
            onClose={() => setIsCategoryModalOpen(false)} 
            category={null}
            onSuccessCallback={(cat) => setFormData({ ...formData, categoryId: cat.id })}
          />
        </div>
      )}
      <style>{`
        .hide-spinners::-webkit-inner-spin-button,
        .hide-spinners::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-spinners {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}

const styles = {
  label: {
    display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800,
    color: 'var(--text-muted)', letterSpacing: '0.05em'
  },
  inputWrap: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute' as const, left: 14, color: 'var(--text-muted)' },
  input: {
    width: '100%', padding: '12px 14px 12px 42px',
    background: 'var(--bg-dark)', border: '1px solid var(--border-dark)',
    borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-main)',
    outline: 'none', transition: 'all 0.2s', colorScheme: 'dark',
  },
  inputSimple: {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-dark)', border: '1px solid var(--border-dark)',
    borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-main)',
    outline: 'none'
  },
  fileUploadBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', borderRadius: 12,
    border: '1px dashed var(--border-dark)',
    background: 'var(--bg-dark)',
    color: 'var(--text-muted)',
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const
  }
};
