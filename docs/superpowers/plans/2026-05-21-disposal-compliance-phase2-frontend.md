# Disposal Protocol Compliance — Phase 2 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete frontend for the 3-step disposal request workflow — new request modal, disposals list page, and detail drawer with inline L1/L2 action panels.

**Architecture:** New `features/disposal-requests/` module with a list page and detail drawer. The existing `AssetDetailsDrawer` "Dispose" button is split by role: SUPER_ADMIN keeps direct dispose (emergency), everyone else gets "Request Disposal" opening the new structured modal. Three small backend additions support the frontend: item-level "has open request" check endpoint, `itemId` filter on the list endpoint, and a photo upload endpoint.

**Tech Stack:** React 19, TypeScript, Zustand, TanStack React Query v5, TanStack React Table v8, Lucide React icons, inline styles + CSS variables matching existing patterns, react-hot-toast for feedback.

---

## File Map

| Action | Path |
|---|---|
| Modify | `inventory-api/src/disposal-requests/dto/disposal-request.dto.ts` |
| Modify | `inventory-api/src/disposal-requests/disposal-requests.service.ts` |
| Modify | `inventory-api/src/disposal-requests/disposal-requests.controller.ts` |
| Modify | `inventory-UI/src/types/index.ts` |
| Create | `inventory-UI/src/services/disposal-request.service.ts` |
| Modify | `inventory-UI/src/store/notification.store.ts` |
| Modify | `inventory-UI/src/components/layout/Sidebar.tsx` |
| Modify | `inventory-UI/src/router/index.tsx` |
| Create | `inventory-UI/src/features/disposal-requests/RequestDisposalModal.tsx` |
| Modify | `inventory-UI/src/features/items/AssetDetailsDrawer.tsx` |
| Create | `inventory-UI/src/features/disposal-requests/DisposalRequestsPage.tsx` |
| Create | `inventory-UI/src/features/disposal-requests/DisposalRequestDetailDrawer.tsx` |

---

## Task 1: Backend additions + frontend types + service

**Goal:** Three small backend additions, add new enums/interfaces to the frontend types file, create the disposal-request API service.

**Files:**
- Modify: `inventory-api/src/disposal-requests/dto/disposal-request.dto.ts`
- Modify: `inventory-api/src/disposal-requests/disposal-requests.service.ts`
- Modify: `inventory-api/src/disposal-requests/disposal-requests.controller.ts`
- Modify: `inventory-UI/src/types/index.ts`
- Create: `inventory-UI/src/services/disposal-request.service.ts`

### 1a — Backend: add `itemId` filter + `GET /disposal-requests/check/:itemId` + photo upload

- [ ] **Step 1: Add `itemId` to query DTO**

Open `inventory-api/src/disposal-requests/dto/disposal-request.dto.ts`. After the existing `companyId` field in `DisposalRequestQueryDto`, add:

```typescript
@IsUUID()
@IsOptional()
itemId?: string;
```

Full updated class:
```typescript
export class DisposalRequestQueryDto {
  @IsEnum(DisposalRequestStatus)
  @IsOptional()
  status?: DisposalRequestStatus;

  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsUUID()
  @IsOptional()
  itemId?: string;
}
```

- [ ] **Step 2: Apply `itemId` filter in service `findAll`**

Open `inventory-api/src/disposal-requests/disposal-requests.service.ts`. In the `findAll` method, after the existing `if (filters.status)` and `if (filters.companyId)` blocks, add:

```typescript
if (filters.itemId) {
  query.andWhere('r.itemId = :itemId', { itemId: filters.itemId });
}
```

- [ ] **Step 3: Add `checkItem` service method**

In `disposal-requests.service.ts`, add this new method after `findOne`:

```typescript
async checkItem(itemId: string, callerCompanyId?: string) {
  const qb = this.requestRepo
    .createQueryBuilder('r')
    .where('r.itemId = :itemId', { itemId })
    .andWhere('r.status IN (:...statuses)', {
      statuses: [DisposalRequestStatus.PENDING_L1, DisposalRequestStatus.PENDING_L2],
    });

  if (callerCompanyId) {
    qb.andWhere('r.companyId = :companyId', { companyId: callerCompanyId });
  }

  const request = await qb.getOne();
  return {
    hasOpen: !!request,
    requestId: request?.id ?? null,
    status: request?.status ?? null,
  };
}
```

- [ ] **Step 4: Add photo upload to controller**

In `inventory-api/src/disposal-requests/disposal-requests.controller.ts`, add these imports at the top (append to existing imports):

```typescript
import {
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { s3Storage } from '../storage/s3.storage';
```

Then add these two new endpoints inside the class (after the `cancel` endpoint):

```typescript
@Get('check/:itemId')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Permissions(AdminPermission.REQUEST_DISPOSAL)
checkItem(@Param('itemId') itemId: string, @CurrentUser() user: JwtPayload) {
  return this.service.checkItem(itemId, user.companyId);
}

@Post('upload-photo')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Permissions(AdminPermission.REQUEST_DISPOSAL)
@UseInterceptors(FileInterceptor('file', { storage: s3Storage('disposal-evidence') }))
uploadPhoto(
  @UploadedFile(
    new ParseFilePipeBuilder()
      .addMaxSizeValidator({ maxSize: 1024 * 1024 * 10 })
      .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
  )
  file: Express.Multer.File,
) {
  return { url: (file as any).location };
}
```

Also add the `checkItem` endpoint to `findAll` controller so SUPER_ADMIN can also filter by itemId:

```typescript
@Get()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Permissions(AdminPermission.MANAGE_DISPOSALS)
findAll(
  @Query() query: DisposalRequestQueryDto,
  @CurrentUser() user: JwtPayload,
) {
  const companyId =
    user.role === UserRole.SUPER_ADMIN ? query.companyId : user.companyId;
  return this.service.findAll({ status: query.status, companyId, itemId: query.itemId });
}
```

- [ ] **Step 5: Verify the backend compiles**

Run from `inventory-api/`:
```bash
npx tsc --noEmit
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 6: Commit backend additions**

```bash
git add inventory-api/src/disposal-requests/
git commit -m "feat: add itemId filter, check endpoint, and photo upload to disposal-requests"
```

---

### 1b — Frontend: types

- [ ] **Step 7: Add new enums and interface to `types/index.ts`**

Open `inventory-UI/src/types/index.ts`.

**Add three new permissions to `AdminPermission` enum** (after `MANAGE_DISPOSALS`):

```typescript
REQUEST_DISPOSAL = 'REQUEST_DISPOSAL',
APPROVE_DISPOSAL_L1 = 'APPROVE_DISPOSAL_L1',
APPROVE_DISPOSAL_L2 = 'APPROVE_DISPOSAL_L2',
```

**Add `RETURNED_TO_VENDOR` to `DisposalMethod` enum** (after `RECYCLED`):

```typescript
RETURNED_TO_VENDOR = 'RETURNED_TO_VENDOR',
```

**Append these new enums at the end of the file** (after the closing `}` of `NotificationType`):

```typescript
export enum DisposalCondition {
  BEYOND_REPAIR = 'BEYOND_REPAIR',
  OBSOLETE = 'OBSOLETE',
  UNUSED = 'UNUSED',
  PHYSICALLY_DAMAGED = 'PHYSICALLY_DAMAGED',
}

export enum DisposalRequestStatus {
  PENDING_L1 = 'PENDING_L1',
  PENDING_L2 = 'PENDING_L2',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum DisposalReviewDecision {
  RECOMMENDED = 'RECOMMENDED',
  REJECTED = 'REJECTED',
}

export enum DisposalFinalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface DataSecurityChecklist {
  businessDataBacked: boolean;
  companyDataErased: boolean;
  storageFormatted: boolean;
  userAccountsRemoved: boolean;
  removedFromDomain: boolean;
  physicalDestructionDone: boolean;
}

export interface DisposalRequestUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DisposalRequest {
  id: string;
  itemId: string;
  item: { id: string; name: string; barcode: string; category: { name: string } };
  companyId: string;

  requestedByUserId: string;
  requestedByUser: DisposalRequestUser;
  requestedAt: string;
  disposalReason: string;
  disposalCondition: DisposalCondition;
  technicalEvaluation: string;
  proposedMethod: DisposalMethod;
  evidencePhotoUrls: string[] | null;
  notes: string | null;

  l1ReviewedByUserId: string | null;
  l1ReviewedByUser: Pick<DisposalRequestUser, 'firstName' | 'lastName'> | null;
  l1ReviewedAt: string | null;
  l1Decision: DisposalReviewDecision | null;
  l1Notes: string | null;

  l2ApprovedByUserId: string | null;
  l2ApprovedByUser: Pick<DisposalRequestUser, 'firstName' | 'lastName'> | null;
  l2ApprovedAt: string | null;
  l2Decision: DisposalFinalDecision | null;
  l2Notes: string | null;
  l1Bypassed: boolean;
  dataSecurityChecklist: DataSecurityChecklist | null;

  status: DisposalRequestStatus;
  updatedAt: string;
}
```

- [ ] **Step 8: Verify TypeScript sees the new types**

Run from `inventory-UI/`:
```bash
npx tsc --noEmit
```
Expected: no new errors.

---

### 1c — Frontend: service

- [ ] **Step 9: Create `disposal-request.service.ts`**

Create file `inventory-UI/src/services/disposal-request.service.ts` with full content:

```typescript
import apiClient from './api.client';
import {
  DisposalRequest,
  DisposalRequestStatus,
  DisposalCondition,
  DisposalMethod,
  DisposalReviewDecision,
  DisposalFinalDecision,
  DataSecurityChecklist,
} from '@/types';

export interface CreateDisposalRequestDto {
  itemId: string;
  disposalReason: string;
  disposalCondition: DisposalCondition;
  technicalEvaluation: string;
  proposedMethod: DisposalMethod;
  evidencePhotoUrls?: string[];
  notes?: string;
}

export interface L1ReviewDto {
  decision: DisposalReviewDecision;
  notes?: string;
}

export interface L2ApproveDto {
  decision: DisposalFinalDecision;
  notes?: string;
  dataSecurityChecklist?: DataSecurityChecklist;
}

export interface DisposalRequestFilters {
  status?: DisposalRequestStatus;
  companyId?: string;
  itemId?: string;
}

export interface ItemDisposalCheck {
  hasOpen: boolean;
  requestId: string | null;
  status: DisposalRequestStatus | null;
}

export const disposalRequestService = {
  create: async (dto: CreateDisposalRequestDto): Promise<DisposalRequest> => {
    const { data } = await apiClient.post('/disposal-requests', dto);
    return data;
  },

  getAll: async (filters: DisposalRequestFilters = {}): Promise<DisposalRequest[]> => {
    const { data } = await apiClient.get('/disposal-requests', { params: filters });
    return data;
  },

  getOne: async (id: string): Promise<DisposalRequest> => {
    const { data } = await apiClient.get(`/disposal-requests/${id}`);
    return data;
  },

  checkItem: async (itemId: string): Promise<ItemDisposalCheck> => {
    const { data } = await apiClient.get(`/disposal-requests/check/${itemId}`);
    return data;
  },

  l1Review: async (id: string, dto: L1ReviewDto): Promise<DisposalRequest> => {
    const { data } = await apiClient.patch(`/disposal-requests/${id}/l1-review`, dto);
    return data;
  },

  l2Approve: async (id: string, dto: L2ApproveDto): Promise<DisposalRequest> => {
    const { data } = await apiClient.patch(`/disposal-requests/${id}/l2-approve`, dto);
    return data;
  },

  cancel: async (id: string): Promise<DisposalRequest> => {
    const { data } = await apiClient.patch(`/disposal-requests/${id}/cancel`);
    return data;
  },

  uploadPhoto: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/disposal-requests/upload-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url as string;
  },
};
```

- [ ] **Step 10: Commit frontend types + service**

```bash
git add inventory-UI/src/types/index.ts inventory-UI/src/services/disposal-request.service.ts
git commit -m "feat: add disposal request types and service layer"
```

---

## Task 2: RequestDisposalModal

**Goal:** New structured modal for submitting a disposal request (replaces the old one-field DisposeModal for non-SUPER_ADMIN users).

**Files:**
- Create: `inventory-UI/src/features/disposal-requests/RequestDisposalModal.tsx`

Fields: disposal condition (required select), disposal reason (required text), technical evaluation (required textarea), proposed method (required select — no default), evidence photos (optional file upload, multi-upload), notes (optional textarea).

- [ ] **Step 1: Create `RequestDisposalModal.tsx`**

Create file `inventory-UI/src/features/disposal-requests/RequestDisposalModal.tsx`:

```tsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ClipboardList, Upload, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { disposalRequestService } from '@/services/disposal-request.service';
import { DisposalCondition, DisposalMethod } from '@/types';
import { Item } from '@/services/item.service';

interface Props {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

const CONDITION_LABELS: Record<DisposalCondition, string> = {
  BEYOND_REPAIR: 'Beyond Repair',
  OBSOLETE: 'Obsolete / End of Life',
  UNUSED: 'Unused / Surplus',
  PHYSICALLY_DAMAGED: 'Physically Damaged',
};

const METHOD_LABELS: Record<DisposalMethod, string> = {
  SCRAPPED: 'Scrapped / Destroyed',
  DONATED: 'Donated',
  RECYCLED: 'Recycled',
  SOLD: 'Sold',
  RETURNED_TO_VENDOR: 'Returned to Vendor',
};

export default function RequestDisposalModal({ item, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    disposalReason: '',
    disposalCondition: '' as DisposalCondition | '',
    technicalEvaluation: '',
    proposedMethod: '' as DisposalMethod | '',
    notes: '',
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      let evidencePhotoUrls: string[] | undefined;
      if (photoFiles.length > 0) {
        setUploadingPhotos(true);
        try {
          evidencePhotoUrls = await Promise.all(
            photoFiles.map(f => disposalRequestService.uploadPhoto(f))
          );
        } finally {
          setUploadingPhotos(false);
        }
      }
      return disposalRequestService.create({
        itemId: item.id,
        disposalReason: form.disposalReason,
        disposalCondition: form.disposalCondition as DisposalCondition,
        technicalEvaluation: form.technicalEvaluation,
        proposedMethod: form.proposedMethod as DisposalMethod,
        evidencePhotoUrls,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['disposal-check', item.id] });
      toast.success('Disposal request submitted for review');
      handleClose();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Failed to submit disposal request'),
  });

  const handleClose = () => {
    setForm({ disposalReason: '', disposalCondition: '', technicalEvaluation: '', proposedMethod: '', notes: '' });
    setPhotoFiles([]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.disposalCondition) { toast.error('Select a disposal condition'); return; }
    if (!form.disposalReason.trim()) { toast.error('Disposal reason is required'); return; }
    if (!form.technicalEvaluation.trim()) { toast.error('Technical evaluation is required'); return; }
    if (!form.proposedMethod) { toast.error('Select a proposed disposal method'); return; }
    mutation.mutate();
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(prev => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  };

  if (!isOpen) return null;

  const isSubmitting = mutation.isPending || uploadingPhotos;

  return (
    <div className="modal-overlay" style={s.overlay} onClick={handleClose}>
      <div className="modal" style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={s.iconBox}><ClipboardList size={20} /></div>
            <div>
              <h3 style={s.title}>Request Disposal</h3>
              <p style={s.subtitle}>{item.barcode} — {item.name}</p>
            </div>
          </div>
          <button onClick={handleClose} style={s.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info alert */}
          <div style={s.alert}>
            <AlertTriangle size={15} />
            <span>A disposal request will be submitted for review and approval. The asset will not be disposed until all approvals are complete.</span>
          </div>

          {/* Disposal Condition */}
          <div>
            <label style={s.label}>DISPOSAL CONDITION <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select
              style={s.select}
              value={form.disposalCondition}
              onChange={e => setForm(f => ({ ...f, disposalCondition: e.target.value as DisposalCondition }))}
            >
              <option value="">— Select condition —</option>
              {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Disposal Reason */}
          <div>
            <label style={s.label}>DISPOSAL REASON <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input
              style={s.input}
              placeholder="Brief reason (e.g. CPU burnt out, no longer functional)"
              value={form.disposalReason}
              onChange={e => setForm(f => ({ ...f, disposalReason: e.target.value }))}
            />
          </div>

          {/* Technical Evaluation */}
          <div>
            <label style={s.label}>TECHNICAL EVALUATION <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea
              style={{ ...s.textarea, minHeight: 100 }}
              placeholder="Describe the technical issues found, repair attempts made, and why the asset cannot be recovered..."
              value={form.technicalEvaluation}
              onChange={e => setForm(f => ({ ...f, technicalEvaluation: e.target.value }))}
            />
          </div>

          {/* Proposed Method */}
          <div>
            <label style={s.label}>PROPOSED DISPOSAL METHOD <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select
              style={s.select}
              value={form.proposedMethod}
              onChange={e => setForm(f => ({ ...f, proposedMethod: e.target.value as DisposalMethod }))}
            >
              <option value="">— Select method —</option>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Photo Evidence */}
          <div>
            <label style={s.label}>EVIDENCE PHOTOS (optional, max 5)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {photoFiles.map((f, i) => (
                <div key={i} style={s.photoRow}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button type="button" onClick={() => setPhotoFiles(prev => prev.filter((_, j) => j !== i))} style={s.removeBtn}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {photoFiles.length < 5 && (
                <label style={s.uploadBtn}>
                  <Upload size={14} />
                  <span>Add Photo</span>
                  <input type="file" accept="image/*,application/pdf" multiple onChange={handleFileAdd} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={s.label}>ADDITIONAL NOTES (optional)</label>
            <textarea
              style={s.textarea}
              placeholder="Any extra context for the reviewer..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Footer */}
          <div style={s.footer}>
            <button type="button" onClick={handleClose} className="btn btn-secondary" style={{ fontSize: 14 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: 180 }}>
              {isSubmitting ? (uploadingPhotos ? 'Uploading photos...' : 'Submitting...') : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  modal: { width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' as const, background: 'var(--color-surface)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  header: { padding: '20px 24px', background: 'var(--color-sidebar)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as const, top: 0, zIndex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' },
  title: { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 },
  alert: { padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-secondary)', fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 600, lineHeight: 1.5 },
  label: { display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: '0.05em' },
  input: { width: '100%', padding: '12px 14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' },
  select: { width: '100%', padding: '12px 14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' },
  textarea: { width: '100%', padding: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', minHeight: 72, resize: 'none' as const },
  photoRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)' },
  removeBtn: { background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 2, display: 'flex' },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--color-border)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  footer: { paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 },
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add inventory-UI/src/features/disposal-requests/RequestDisposalModal.tsx
git commit -m "feat: add RequestDisposalModal with structured disposal form"
```

---

## Task 3: Update AssetDetailsDrawer

**Goal:** Replace the single "Dispose" button with role-aware logic. SUPER_ADMIN keeps the direct dispose button. Users with `REQUEST_DISPOSAL` get a "Request Disposal" button + a "Disposal Pending" badge when a request is already open.

**Files:**
- Modify: `inventory-UI/src/features/items/AssetDetailsDrawer.tsx`

- [ ] **Step 1: Add imports at top of AssetDetailsDrawer**

In the imports section, add:

```typescript
import { useQuery } from '@tanstack/react-query';  // already imported, just verify
import RequestDisposalModal from '@/features/disposal-requests/RequestDisposalModal';
import { disposalRequestService } from '@/services/disposal-request.service';
import { AdminPermission, ItemStatus, UserRole } from '@/types';  // add UserRole
```

- [ ] **Step 2: Update the `activeModal` union type**

Find:
```typescript
const [activeModal, setActiveModal] = useState<'assign' | 'repair' | 'dispose' | 'lost' | 'return' | 'recover' | 'return-warehouse' | null>(null);
```

Replace with:
```typescript
const [activeModal, setActiveModal] = useState<'assign' | 'repair' | 'dispose' | 'request-disposal' | 'lost' | 'return' | 'recover' | 'return-warehouse' | null>(null);
```

- [ ] **Step 3: Add the disposal check query**

After the `useAuthStore` line:
```typescript
const hasPermission = useAuthStore(s => s.hasPermission);
```

Add:
```typescript
const isSuperAdmin = useAuthStore(s => s.isSuperAdmin);

const { data: disposalCheck } = useQuery({
  queryKey: ['disposal-check', initialItem.id],
  queryFn: () => disposalRequestService.checkItem(initialItem.id),
  enabled: isOpen && hasPermission(AdminPermission.REQUEST_DISPOSAL),
});
```

- [ ] **Step 4: Replace the dispose button section**

Find this block (the Dispose button):
```typescript
{item.status !== ItemStatus.DISPOSED && hasPermission(AdminPermission.MANAGE_DISPOSALS) && (
  <button className="hub-btn danger" onClick={() => setActiveModal('dispose')} style={{ opacity: 0.8 }}>
    <Trash2 size={16} />
    <span>Dispose</span>
  </button>
)}
```

Replace with:
```typescript
{item.status !== ItemStatus.DISPOSED && isSuperAdmin() && (
  <button className="hub-btn danger" onClick={() => setActiveModal('dispose')} style={{ opacity: 0.8 }} title="Emergency direct disposal (SUPER_ADMIN only)">
    <Trash2 size={16} />
    <span>Emergency Dispose</span>
  </button>
)}
{item.status !== ItemStatus.DISPOSED && !isSuperAdmin() && hasPermission(AdminPermission.REQUEST_DISPOSAL) && (
  disposalCheck?.hasOpen ? (
    <div style={{
      flex: 1, padding: '10px 14px',
      background: 'rgba(245,158,11,0.08)',
      border: '1.5px solid rgba(245,158,11,0.3)',
      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontWeight: 700, color: '#f59e0b',
    }}>
      <ClipboardList size={14} style={{ flexShrink: 0 }} />
      Disposal request pending approval
    </div>
  ) : (
    <button className="hub-btn danger" onClick={() => setActiveModal('request-disposal')} style={{ opacity: 0.9 }}>
      <ClipboardList size={16} />
      <span>Request Disposal</span>
    </button>
  )
)}
```

- [ ] **Step 5: Add ClipboardList to imports**

Find the existing lucide-react imports and add `ClipboardList`:
```typescript
import { 
  X, History, FileText, User, Building, ShieldCheck, CheckCircle2, Clock, Download,
  Trash2, UserPlus, Wrench, BadgeDollarSign, Layers, Link, ChevronRight,
  Camera, AlertOctagon, Hash, ClipboardList
} from 'lucide-react';
```

- [ ] **Step 6: Mount the RequestDisposalModal**

Find the `<DisposeModal .../>` line and add the new modal below it:
```typescript
<DisposeModal item={item} isOpen={activeModal === 'dispose'} onClose={() => setActiveModal(null)} />
<RequestDisposalModal item={item} isOpen={activeModal === 'request-disposal'} onClose={() => setActiveModal(null)} />
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add inventory-UI/src/features/items/AssetDetailsDrawer.tsx
git commit -m "feat: replace dispose button with role-aware request disposal flow"
```

---

## Task 4: Sidebar + Router + Notification store

**Goal:** Add the Disposals nav entry (visible to any of three disposal permissions), route it, and make real-time notifications invalidate the disposal-requests cache.

**Files:**
- Modify: `inventory-UI/src/components/layout/Sidebar.tsx`
- Modify: `inventory-UI/src/router/index.tsx`
- Modify: `inventory-UI/src/store/notification.store.ts`

- [ ] **Step 1: Update Sidebar to support `anyPermission` nav items**

Open `inventory-UI/src/components/layout/Sidebar.tsx`.

At the top of the file, update the import to include `Trash2`:
```typescript
import { 
  LayoutDashboard, Building2, Network, Users, PackageSearch, Tag,
  BarChart3, ListTodo, Settings, X, UserCheck, Trash2
} from 'lucide-react';
```

Update the MENU_ITEMS array type. Find:
```typescript
const MENU_ITEMS = [
```

The items currently use `{ path, label, icon, permission? }`. Add the Disposals entry using a `anyPermission` array. Replace the full `MENU_ITEMS` constant with:

```typescript
interface MenuItem {
  path: string;
  label: string;
  icon: React.ElementType;
  permission?: AdminPermission;
  anyPermission?: AdminPermission[];
}

const MENU_ITEMS: MenuItem[] = [
  { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { path: '/companies', label: 'COMPANIES', icon: Building2, permission: AdminPermission.VIEW_COMPANIES },
  { path: '/departments', label: 'DEPARTMENTS', icon: Network, permission: AdminPermission.VIEW_DEPARTMENTS },
  { path: '/categories', label: 'CATEGORIES', icon: Tag, permission: AdminPermission.VIEW_CATEGORIES },
  { path: '/items', label: 'ITEMS', icon: PackageSearch, permission: AdminPermission.VIEW_ITEMS },
  { path: '/disposals', label: 'DISPOSALS', icon: Trash2, anyPermission: [AdminPermission.MANAGE_DISPOSALS, AdminPermission.APPROVE_DISPOSAL_L1, AdminPermission.APPROVE_DISPOSAL_L2] },
  { path: '/employees', label: 'EMPLOYEES', icon: UserCheck, permission: AdminPermission.VIEW_EMPLOYEES },
  { path: '/users', label: 'USERS', icon: Users, permission: AdminPermission.VIEW_USERS },
  { path: '/reports', label: 'REPORTS', icon: BarChart3, permission: AdminPermission.VIEW_REPORTS },
  { path: '/logs', label: 'AUDIT LOGS', icon: ListTodo, permission: AdminPermission.VIEW_AUDIT_LOGS },
];
```

Also need to add `import React from 'react';` if not already at top, OR use the `React.ElementType` inline.
Actually, since the file already uses JSX, React is in scope. Just use `React.ElementType` if React is imported; otherwise use `FC` or just leave it as-is and TypeScript will infer it. To be safe, type the icon as `any` in the interface since other entries also don't import ElementType explicitly:

```typescript
interface MenuItem {
  path: string;
  label: string;
  icon: any;
  permission?: AdminPermission;
  anyPermission?: AdminPermission[];
}
```

- [ ] **Step 2: Update the filter logic in Sidebar**

Find:
```typescript
{MENU_ITEMS.filter(item => !item.permission || hasPermission(item.permission)).map((item) => (
```

Replace with:
```typescript
{MENU_ITEMS.filter(item => {
  if (item.anyPermission) return item.anyPermission.some(p => hasPermission(p));
  return !item.permission || hasPermission(item.permission);
}).map((item) => (
```

- [ ] **Step 3: Add the `/disposals` route to the router**

Open `inventory-UI/src/router/index.tsx`. Add after the items routes:

```typescript
const DisposalRequestsPage = lazy(() => import('@/features/disposal-requests/DisposalRequestsPage'));
```

And in the routes array, add after `{ path: '/items/:id', element: <ItemDeepLinkPage /> }`:
```typescript
{ path: '/disposals', element: <DisposalRequestsPage /> },
```

- [ ] **Step 4: Add disposal-requests cache invalidation to notification store**

Open `inventory-UI/src/store/notification.store.ts`. In the `socket.on('new_notification', ...)` handler, find the block:

```typescript
// Sync Items/Assets
if (type.startsWith('ITEM_') || type.startsWith('DISPOSAL_')) {
  queryClient.invalidateQueries({ queryKey: ['items'] });
  queryClient.invalidateQueries({ queryKey: ['analytics'] });
}
```

Replace it with:
```typescript
// Sync Items/Assets
if (type.startsWith('ITEM_') || type.startsWith('DISPOSAL_')) {
  queryClient.invalidateQueries({ queryKey: ['items'] });
  queryClient.invalidateQueries({ queryKey: ['analytics'] });
}

// Sync Disposal Requests
if (type.startsWith('DISPOSAL_')) {
  queryClient.invalidateQueries({ queryKey: ['disposal-requests'] });
  queryClient.invalidateQueries({ queryKey: ['disposal-check'] });
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add inventory-UI/src/components/layout/Sidebar.tsx inventory-UI/src/router/index.tsx inventory-UI/src/store/notification.store.ts
git commit -m "feat: add disposals nav entry, route, and real-time cache invalidation"
```

---

## Task 5: DisposalRequestsPage

**Goal:** Filterable list page for all disposal requests, using the TanStack Table pattern. Visible to users with any disposal management or approval permission.

**Files:**
- Create: `inventory-UI/src/features/disposal-requests/DisposalRequestsPage.tsx`

- [ ] **Step 1: Create `DisposalRequestsPage.tsx`**

Create file `inventory-UI/src/features/disposal-requests/DisposalRequestsPage.tsx`:

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ClipboardList, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { disposalRequestService } from '@/services/disposal-request.service';
import { DisposalRequest, DisposalRequestStatus, AdminPermission } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import DisposalRequestDetailDrawer from './DisposalRequestDetailDrawer';

const columnHelper = createColumnHelper<DisposalRequest>();

const STATUS_STYLES: Record<DisposalRequestStatus, { bg: string; color: string; label: string }> = {
  PENDING_L1:  { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Awaiting L1 Review' },
  PENDING_L2:  { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', label: 'Awaiting Final Approval' },
  APPROVED:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Approved' },
  REJECTED:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Rejected' },
  CANCELLED:   { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

const CONDITION_LABELS: Record<string, string> = {
  BEYOND_REPAIR:     'Beyond Repair',
  OBSOLETE:          'Obsolete',
  UNUSED:            'Unused',
  PHYSICALLY_DAMAGED:'Damaged',
};

const METHOD_LABELS: Record<string, string> = {
  SCRAPPED:          'Scrapped',
  DONATED:           'Donated',
  RECYCLED:          'Recycled',
  SOLD:              'Sold',
  RETURNED_TO_VENDOR:'Return to Vendor',
};

function StatusBadge({ status }: { status: DisposalRequestStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
      textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
    }}>
      {s.label}
    </span>
  );
}

export default function DisposalRequestsPage() {
  const { hasPermission, user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [statusFilter, setStatusFilter] = useState<DisposalRequestStatus | ''>('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DisposalRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['disposal-requests', { status: statusFilter, companyId: companyFilter }],
    queryFn: () => disposalRequestService.getAll({
      status: statusFilter || undefined,
      companyId: companyFilter || undefined,
    }),
    enabled:
      hasPermission(AdminPermission.MANAGE_DISPOSALS) ||
      hasPermission(AdminPermission.APPROVE_DISPOSAL_L1) ||
      hasPermission(AdminPermission.APPROVE_DISPOSAL_L2),
  });

  const filtered = search
    ? requests.filter(r =>
        r.item.name.toLowerCase().includes(search.toLowerCase()) ||
        r.item.barcode.toLowerCase().includes(search.toLowerCase()) ||
        `${r.requestedByUser.firstName} ${r.requestedByUser.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : requests;

  const columns = [
    columnHelper.accessor('item', {
      header: 'Asset',
      cell: info => {
        const item = info.getValue();
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.name}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{item.barcode}</div>
          </div>
        );
      },
    }),
    columnHelper.accessor('requestedByUser', {
      header: 'Requested By',
      cell: info => {
        const u = info.getValue();
        return <span style={{ fontSize: 13, fontWeight: 600 }}>{u.firstName} {u.lastName}</span>;
      },
    }),
    columnHelper.accessor('disposalCondition', {
      header: 'Condition',
      cell: info => (
        <span style={{ fontSize: 12, fontWeight: 700 }}>{CONDITION_LABELS[info.getValue()] || info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('proposedMethod', {
      header: 'Method',
      cell: info => (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{METHOD_LABELS[info.getValue()] || info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('requestedAt', {
      header: 'Submitted',
      cell: info => (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {format(new Date(info.getValue()), 'MMM dd, yyyy')}
        </span>
      ),
    }),
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Disposal Requests</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Review and approve asset disposal requests
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
            placeholder="Search asset, barcode, requester..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={15} style={{ color: 'var(--color-text-muted)' }} />
          <select
            style={{ padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as DisposalRequestStatus | '')}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 60, textAlign: 'center' }}>
                  <ClipboardList size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.4, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>No disposal requests found</div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => { setSelectedRequest(row.original); setIsDrawerOpen(true); }}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-dark)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ padding: '14px 16px' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <DisposalRequestDetailDrawer
          requestId={selectedRequest.id}
          isOpen={isDrawerOpen}
          onClose={() => { setIsDrawerOpen(false); setSelectedRequest(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Note: `DisposalRequestDetailDrawer` doesn't exist yet — TypeScript will error on the import. Add a temporary stub file to unblock this step:

Create `inventory-UI/src/features/disposal-requests/DisposalRequestDetailDrawer.tsx` with just:
```tsx
export default function DisposalRequestDetailDrawer(_props: { requestId: string; isOpen: boolean; onClose: () => void }) {
  return null;
}
```

Then run `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 3: Commit page (with stub drawer)**

```bash
git add inventory-UI/src/features/disposal-requests/
git commit -m "feat: add DisposalRequestsPage with filterable table"
```

---

## Task 6: DisposalRequestDetailDrawer with L1ReviewPanel and L2ApprovalPanel

**Goal:** Full-detail side drawer for a single disposal request. Shows a 3-step timeline (request → L1 review → final approval). Renders inline action panels when the current user can act (L1 reviewer or L2 approver). Requester can cancel from here too.

**Files:**
- Modify: `inventory-UI/src/features/disposal-requests/DisposalRequestDetailDrawer.tsx` (replace the stub)

- [ ] **Step 1: Replace stub with full implementation**

Replace the entire content of `inventory-UI/src/features/disposal-requests/DisposalRequestDetailDrawer.tsx` with:

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, ClipboardList, CheckCircle2, Clock, XCircle, AlertTriangle,
  User, ChevronRight, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { disposalRequestService } from '@/services/disposal-request.service';
import {
  DisposalRequest, DisposalRequestStatus, DisposalReviewDecision,
  DisposalFinalDecision, AdminPermission, DataSecurityChecklist,
} from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { getUploadUrl } from '@/lib/config';

interface Props {
  requestId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CONDITION_LABELS: Record<string, string> = {
  BEYOND_REPAIR: 'Beyond Repair',
  OBSOLETE: 'Obsolete / End of Life',
  UNUSED: 'Unused / Surplus',
  PHYSICALLY_DAMAGED: 'Physically Damaged',
};

const METHOD_LABELS: Record<string, string> = {
  SCRAPPED: 'Scrapped',
  DONATED: 'Donated',
  RECYCLED: 'Recycled',
  SOLD: 'Sold',
  RETURNED_TO_VENDOR: 'Returned to Vendor',
};

const STATUS_COLOR: Record<DisposalRequestStatus, string> = {
  PENDING_L1: '#f59e0b',
  PENDING_L2: '#818cf8',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  CANCELLED: '#64748b',
};

const STATUS_LABEL: Record<DisposalRequestStatus, string> = {
  PENDING_L1: 'Awaiting L1 Review',
  PENDING_L2: 'Awaiting Final Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

// ── L1 Review Panel ─────────────────────────────────────────────
function L1ReviewPanel({ request, onDone }: { request: DisposalRequest; onDone: () => void }) {
  const [decision, setDecision] = useState<DisposalReviewDecision | ''>('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => disposalRequestService.l1Review(request.id, {
      decision: decision as DisposalReviewDecision,
      notes: notes || undefined,
    }),
    onSuccess: () => { toast.success('Review submitted'); onDone(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit review'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) { toast.error('Select a decision'); return; }
    if (decision === DisposalReviewDecision.REJECTED && !notes.trim()) {
      toast.error('Notes are required when rejecting'); return;
    }
    mutation.mutate();
  };

  return (
    <div style={panelStyle}>
      <div style={panelHeader}>
        <ShieldCheck size={16} style={{ color: '#818cf8' }} />
        <span>Your L1 Review</span>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {([DisposalReviewDecision.RECOMMENDED, DisposalReviewDecision.REJECTED] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                border: decision === d ? `2px solid ${d === DisposalReviewDecision.RECOMMENDED ? '#10b981' : '#ef4444'}` : '2px solid var(--color-border)',
                background: decision === d ? (d === DisposalReviewDecision.RECOMMENDED ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
                color: decision === d ? (d === DisposalReviewDecision.RECOMMENDED ? '#10b981' : '#ef4444') : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {d === DisposalReviewDecision.RECOMMENDED ? '✓ Recommend' : '✗ Reject'}
            </button>
          ))}
        </div>
        <div>
          <label style={labelStyle}>
            NOTES{decision === DisposalReviewDecision.REJECTED ? <span style={{ color: '#ef4444' }}> *</span> : ' (optional)'}
          </label>
          <textarea
            style={textareaStyle}
            placeholder={decision === DisposalReviewDecision.REJECTED ? 'Required: explain why you are rejecting...' : 'Optional review notes...'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ fontSize: 13 }}>
          {mutation.isPending ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

// ── L2 Approval Panel ────────────────────────────────────────────
const CHECKLIST_LABELS: Record<keyof DataSecurityChecklist, string> = {
  businessDataBacked: 'Business data has been backed up',
  companyDataErased: 'All company data has been erased',
  storageFormatted: 'Storage/drives have been formatted',
  userAccountsRemoved: 'User accounts have been removed',
  removedFromDomain: 'Device has been removed from domain',
  physicalDestructionDone: 'Physical destruction (if applicable) is done',
};

function L2ApprovalPanel({ request, onDone }: { request: DisposalRequest; onDone: () => void }) {
  const [decision, setDecision] = useState<DisposalFinalDecision | ''>('');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<DataSecurityChecklist>({
    businessDataBacked: false,
    companyDataErased: false,
    storageFormatted: false,
    userAccountsRemoved: false,
    removedFromDomain: false,
    physicalDestructionDone: false,
  });

  const allChecked = Object.values(checklist).every(Boolean);

  const mutation = useMutation({
    mutationFn: () => disposalRequestService.l2Approve(request.id, {
      decision: decision as DisposalFinalDecision,
      notes: notes || undefined,
      dataSecurityChecklist: decision === DisposalFinalDecision.APPROVED ? checklist : undefined,
    }),
    onSuccess: () => { toast.success(decision === DisposalFinalDecision.APPROVED ? 'Disposal approved — asset marked as disposed' : 'Request rejected'); onDone(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit decision'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) { toast.error('Select a decision'); return; }
    if (decision === DisposalFinalDecision.REJECTED && !notes.trim()) {
      toast.error('Notes are required when rejecting'); return;
    }
    if (decision === DisposalFinalDecision.APPROVED && !allChecked) {
      toast.error('All data security checklist items must be confirmed before approving'); return;
    }
    mutation.mutate();
  };

  return (
    <div style={panelStyle}>
      <div style={panelHeader}>
        <ShieldCheck size={16} style={{ color: '#10b981' }} />
        <span>Your Final Approval</span>
        {request.l1Bypassed && (
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>
            L1 BYPASSED
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {([DisposalFinalDecision.APPROVED, DisposalFinalDecision.REJECTED] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                border: decision === d ? `2px solid ${d === DisposalFinalDecision.APPROVED ? '#10b981' : '#ef4444'}` : '2px solid var(--color-border)',
                background: decision === d ? (d === DisposalFinalDecision.APPROVED ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
                color: decision === d ? (d === DisposalFinalDecision.APPROVED ? '#10b981' : '#ef4444') : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {d === DisposalFinalDecision.APPROVED ? '✓ Approve' : '✗ Reject'}
            </button>
          ))}
        </div>

        {decision === DisposalFinalDecision.APPROVED && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>DATA SECURITY CHECKLIST <span style={{ color: '#ef4444' }}>*</span></label>
            {(Object.keys(CHECKLIST_LABELS) as (keyof DataSecurityChecklist)[]).map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: checklist[key] ? 'rgba(16,185,129,0.06)' : 'var(--color-surface-2)', border: `1px solid ${checklist[key] ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`, transition: 'all 0.15s' }}>
                <input
                  type="checkbox"
                  checked={checklist[key]}
                  onChange={e => setChecklist(c => ({ ...c, [key]: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#10b981', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: checklist[key] ? '#10b981' : 'var(--color-text-secondary)' }}>
                  {CHECKLIST_LABELS[key]}
                </span>
              </label>
            ))}
            {!allChecked && (
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={12} /> All items must be checked before approving
              </div>
            )}
          </div>
        )}

        <div>
          <label style={labelStyle}>
            NOTES{decision === DisposalFinalDecision.REJECTED ? <span style={{ color: '#ef4444' }}> *</span> : ' (optional)'}
          </label>
          <textarea
            style={textareaStyle}
            placeholder={decision === DisposalFinalDecision.REJECTED ? 'Required: reason for rejection...' : 'Optional notes...'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ fontSize: 13 }}>
          {mutation.isPending ? 'Submitting...' : 'Submit Decision'}
        </button>
      </form>
    </div>
  );
}

// ── Main Drawer ──────────────────────────────────────────────────
export default function DisposalRequestDetailDrawer({ requestId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuthStore();

  const { data: request, isLoading } = useQuery({
    queryKey: ['disposal-request', requestId],
    queryFn: () => disposalRequestService.getOne(requestId),
    enabled: isOpen && !!requestId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => disposalRequestService.cancel(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['disposal-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['disposal-check'] });
      toast.success('Disposal request cancelled');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const handleActionDone = () => {
    queryClient.invalidateQueries({ queryKey: ['disposal-requests'] });
    queryClient.invalidateQueries({ queryKey: ['disposal-request', requestId] });
    queryClient.invalidateQueries({ queryKey: ['disposal-check'] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  if (!isOpen) return null;

  const canL1Review =
    hasPermission(AdminPermission.APPROVE_DISPOSAL_L1) &&
    request?.status === DisposalRequestStatus.PENDING_L1 &&
    request.requestedByUserId !== user?.id;

  const canL2Approve =
    hasPermission(AdminPermission.APPROVE_DISPOSAL_L2) &&
    (request?.status === DisposalRequestStatus.PENDING_L1 || request?.status === DisposalRequestStatus.PENDING_L2) &&
    request?.requestedByUserId !== user?.id;

  const canCancel =
    hasPermission(AdminPermission.REQUEST_DISPOSAL) &&
    request?.requestedByUserId === user?.id &&
    (request?.status === DisposalRequestStatus.PENDING_L1 || request?.status === DisposalRequestStatus.PENDING_L2);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 500, background: 'var(--bg-surface)', zIndex: 1001, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-dark)', boxShadow: '-20px 0 50px rgba(0,0,0,0.3)', animation: 'slideLeft 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', background: 'var(--bg-sidebar)', color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Disposal Request</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {request?.item?.barcode || '—'} — {request?.item?.name || '—'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
          {request && (
            <div style={{ marginTop: 16 }}>
              <span style={{ padding: '4px 12px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: `${STATUS_COLOR[request.status]}22`, color: STATUS_COLOR[request.status], border: `1px solid ${STATUS_COLOR[request.status]}44`, textTransform: 'uppercase' }}>
                {STATUS_LABEL[request.status]}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }} className="custom-scrollbar">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</div>
          ) : !request ? null : (
            <>
              {/* ── Step 1: Request ── */}
              <TimelineSection
                step={1}
                title="Request Submitted"
                actor={`${request.requestedByUser.firstName} ${request.requestedByUser.lastName}`}
                date={request.requestedAt}
                statusColor="#818cf8"
                done
              >
                <DetailRow label="Condition" value={CONDITION_LABELS[request.disposalCondition] || request.disposalCondition} />
                <DetailRow label="Disposal Reason" value={request.disposalReason} />
                <DetailRow label="Proposed Method" value={METHOD_LABELS[request.proposedMethod] || request.proposedMethod} />
                <div style={{ marginTop: 10 }}>
                  <div style={labelStyle}>TECHNICAL EVALUATION</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border-dark)' }}>
                    {request.technicalEvaluation}
                  </div>
                </div>
                {request.notes && <DetailRow label="Notes" value={request.notes} />}
                {request.evidencePhotoUrls && request.evidencePhotoUrls.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={labelStyle}>EVIDENCE PHOTOS</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {request.evidencePhotoUrls.map((url, i) => (
                        <a key={i} href={getUploadUrl(url)} target="_blank" rel="noopener noreferrer">
                          <img src={getUploadUrl(url)} alt={`Evidence ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-dark)' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </TimelineSection>

              {/* ── Step 2: L1 Review ── */}
              <TimelineSection
                step={2}
                title="L1 Review (IT Manager)"
                actor={request.l1ReviewedByUser ? `${request.l1ReviewedByUser.firstName} ${request.l1ReviewedByUser.lastName}` : undefined}
                date={request.l1ReviewedAt || undefined}
                statusColor={request.l1Decision === DisposalReviewDecision.RECOMMENDED ? '#10b981' : request.l1Decision === DisposalReviewDecision.REJECTED ? '#ef4444' : '#64748b'}
                done={!!request.l1ReviewedAt}
                bypassed={request.l1Bypassed}
              >
                {request.l1Bypassed && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
                    L1 review was bypassed — Director Finance acted directly.
                  </div>
                )}
                {request.l1Decision && !request.l1Bypassed && (
                  <>
                    <DetailRow
                      label="Decision"
                      value={request.l1Decision === DisposalReviewDecision.RECOMMENDED ? '✓ Recommended' : '✗ Rejected'}
                      valueColor={request.l1Decision === DisposalReviewDecision.RECOMMENDED ? '#10b981' : '#ef4444'}
                    />
                    {request.l1Notes && <DetailRow label="Notes" value={request.l1Notes} />}
                  </>
                )}
              </TimelineSection>

              {/* ── L1 Action Panel ── */}
              {canL1Review && <L1ReviewPanel request={request} onDone={handleActionDone} />}

              {/* ── Step 3: Final Approval ── */}
              <TimelineSection
                step={3}
                title="Final Approval (Director Finance)"
                actor={request.l2ApprovedByUser ? `${request.l2ApprovedByUser.firstName} ${request.l2ApprovedByUser.lastName}` : undefined}
                date={request.l2ApprovedAt || undefined}
                statusColor={request.l2Decision === DisposalFinalDecision.APPROVED ? '#10b981' : request.l2Decision === DisposalFinalDecision.REJECTED ? '#ef4444' : '#64748b'}
                done={!!request.l2ApprovedAt}
              >
                {request.l2Decision && (
                  <>
                    <DetailRow
                      label="Decision"
                      value={request.l2Decision === DisposalFinalDecision.APPROVED ? '✓ Approved — Asset Disposed' : '✗ Rejected'}
                      valueColor={request.l2Decision === DisposalFinalDecision.APPROVED ? '#10b981' : '#ef4444'}
                    />
                    {request.l2Notes && <DetailRow label="Notes" value={request.l2Notes} />}
                    {request.dataSecurityChecklist && (
                      <div style={{ marginTop: 10 }}>
                        <div style={labelStyle}>DATA SECURITY CHECKLIST</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(Object.entries(CHECKLIST_LABELS) as [keyof DataSecurityChecklist, string][]).map(([key, label]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: request.dataSecurityChecklist![key] ? '#10b981' : '#ef4444' }}>
                              {request.dataSecurityChecklist![key] ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TimelineSection>

              {/* ── L2 Action Panel ── */}
              {canL2Approve && <L2ApprovalPanel request={request} onDone={handleActionDone} />}

              {/* ── Cancel ── */}
              {canCancel && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-dark)' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { if (confirm('Cancel this disposal request?')) cancelMutation.mutate(); }}
                    disabled={cancelMutation.isPending}
                    style={{ fontSize: 13, width: '100%' }}
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel This Request'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <style>{`
          @keyframes slideLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </div>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function TimelineSection({ step, title, actor, date, statusColor, done, bypassed, children }: {
  step: number; title: string; actor?: string; date?: string;
  statusColor: string; done: boolean; bypassed?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? `${statusColor}22` : 'var(--bg-dark)', border: `2px solid ${done ? statusColor : 'var(--border-dark)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: done ? statusColor : 'var(--color-text-muted)', fontSize: 11, fontWeight: 900 }}>
          {done ? <CheckCircle2 size={14} /> : step}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--color-text-primary)' }}>{title}</div>
          {done && actor && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <User size={10} />
              {actor}
              {date && <> · <Clock size={10} /> {format(new Date(date), 'MMM dd, HH:mm')}</>}
            </div>
          )}
          {!done && !bypassed && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>Pending</div>
          )}
        </div>
      </div>
      {children && (
        <div style={{ marginLeft: 38, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={labelStyle}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: valueColor || 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  marginBottom: 24, padding: 16,
  background: 'var(--bg-dark)', borderRadius: 12,
  border: '1px solid var(--border-dark)',
};

const panelHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
  fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--color-text-primary)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)',
  letterSpacing: '0.05em', marginBottom: 6, display: 'block',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: 10, background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12,
  color: 'var(--color-text-primary)', outline: 'none', minHeight: 72,
  resize: 'none', fontFamily: 'inherit',
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add inventory-UI/src/features/disposal-requests/DisposalRequestDetailDrawer.tsx
git commit -m "feat: add DisposalRequestDetailDrawer with L1ReviewPanel and L2ApprovalPanel"
```

---

## Task 7: Final verification and DisposeModal alert text fix

**Goal:** Fix the misleading "archived" alert text in `DisposeModal` (now SUPER_ADMIN emergency only), and do a final end-to-end type check across the whole project.

**Files:**
- Modify: `inventory-UI/src/features/items/DisposeModal.tsx`

- [ ] **Step 1: Fix the alert text in DisposeModal**

Open `inventory-UI/src/features/items/DisposeModal.tsx`.

Find:
```tsx
<span>Asset will be marked as <strong>"DISPOSED"</strong> and archived. This action is recorded in audit logs.</span>
```

Replace with:
```tsx
<span>Emergency direct disposal (SUPER_ADMIN only). Asset will be marked as <strong>"DISPOSED"</strong> immediately. This action is recorded in the audit trail as an emergency bypass.</span>
```

- [ ] **Step 2: Run full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run the dev server and manually smoke-test**

```bash
npm run dev
```

Open the app and verify:
1. Items page → open any asset drawer → "Request Disposal" button appears for non-SUPER_ADMIN with `REQUEST_DISPOSAL`
2. SUPER_ADMIN sees "Emergency Dispose" button instead
3. Submitting the form calls `POST /disposal-requests` → check Network tab
4. "DISPOSALS" appears in sidebar for relevant permissions
5. `/disposals` page loads with the table
6. Clicking a row opens the detail drawer
7. Status badge renders correctly for each status
8. L1/L2 action panels appear based on current user's permissions

- [ ] **Step 4: Final commit**

```bash
git add inventory-UI/src/features/items/DisposeModal.tsx
git commit -m "fix: update emergency dispose alert text in DisposeModal"
```

---

## Summary of All Commits

| Commit | Description |
|---|---|
| `feat: add itemId filter, check endpoint, and photo upload to disposal-requests` | Backend: 3 small additions |
| `feat: add disposal request types and service layer` | Frontend types + service |
| `feat: add RequestDisposalModal with structured disposal form` | New request modal |
| `feat: replace dispose button with role-aware request disposal flow` | AssetDetailsDrawer update |
| `feat: add disposals nav entry, route, and real-time cache invalidation` | Sidebar + router + notifications |
| `feat: add DisposalRequestsPage with filterable table` | List page |
| `feat: add DisposalRequestDetailDrawer with L1ReviewPanel and L2ApprovalPanel` | Detail drawer + action panels |
| `fix: update emergency dispose alert text in DisposeModal` | Minor UI text fix |
