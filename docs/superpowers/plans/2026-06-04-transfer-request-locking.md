# Transfer Request Locking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the transfer request feature by adding asset locking (pendingTransferRequestId FK), backend operation guards, a Super Admin Transfers page, locked-state UI in the employee view, and a Resubmit action on rejected notifications.

**Architecture:** A nullable FK `pendingTransferRequestId` on the `items` table acts as the lock. `TransferRequestsService` sets/clears this FK on create/approve/reject/cancel. `ItemsService.assign()`, `.update()`, and `.unassign()` check the FK and throw 409 if set. The frontend reflects lock state per asset row in `EmployeesPage` and a new `/transfers` page lets admins approve or reject.

**Tech Stack:** NestJS + TypeORM (PostgreSQL, auto-sync in dev), React + TanStack Query, Zustand, React Router, react-hot-toast, lucide-react.

---

## File Map

| Action | File |
|---|---|
| Modify | `inventory-api/src/items/entities/transfer-request.entity.ts` |
| Modify | `inventory-api/src/items/entities/item.entity.ts` |
| Modify | `inventory-api/src/notifications/entities/notification.entity.ts` |
| Modify | `inventory-api/src/items/transfer-requests.service.ts` |
| Modify | `inventory-api/src/items/transfer-requests.controller.ts` |
| Modify | `inventory-api/src/items/items.service.ts` |
| Modify | `inventory-UI/src/services/item.service.ts` |
| Create | `inventory-UI/src/services/transfer-requests.service.ts` |
| Modify | `inventory-UI/src/features/employees/TransferRequestModal.tsx` |
| Modify | `inventory-UI/src/features/employees/EmployeesPage.tsx` |
| Create | `inventory-UI/src/features/transfers/TransfersPage.tsx` |
| Modify | `inventory-UI/src/components/layout/Sidebar.tsx` |
| Modify | `inventory-UI/src/router/index.tsx` |
| Modify | `inventory-UI/src/store/notification.store.ts` |
| Modify | `inventory-UI/src/components/layout/TopNavbar.tsx` |

---

## Task 1: Add CANCELLED status + metadata column

**Files:**
- Modify: `inventory-api/src/items/entities/transfer-request.entity.ts`
- Modify: `inventory-api/src/notifications/entities/notification.entity.ts`

- [ ] **Step 1: Add CANCELLED to TransferRequestStatus enum**

In `transfer-request.entity.ts`, extend the enum (lines 15-19):

```typescript
export enum TransferRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
```

- [ ] **Step 2: Add metadata JSONB column to Notification entity**

In `notification.entity.ts`, add after `emailSentAt` (after line 73):

```typescript
@Column({ type: 'jsonb', nullable: true })
metadata?: Record<string, any> | null;
```

- [ ] **Step 3: Restart API server to verify auto-sync applies the enum change**

Run: `cd inventory-api && npm run start:dev`

Expected: No TypeORM errors. The `transfer_requests` status enum now accepts `CANCELLED`.

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/items/entities/transfer-request.entity.ts inventory-api/src/notifications/entities/notification.entity.ts
git commit -m "feat: add CANCELLED transfer status + notification metadata column"
```

---

## Task 2: Add pendingTransferRequestId FK to Item entity

**Files:**
- Modify: `inventory-api/src/items/entities/item.entity.ts`

- [ ] **Step 1: Add the import for TransferRequest at the top of item.entity.ts**

The `item.entity.ts` currently imports from `'../../common/enums'` and other entities. Add the `TransferRequest` import. Find the existing imports block (lines 1-18) and add:

```typescript
import { TransferRequest } from './transfer-request.entity';
```

after the existing local entity imports.

- [ ] **Step 2: Add the FK column and relation to Item**

In `item.entity.ts`, after the `previousAssignedToEmployeeId` column (after line 74), add:

```typescript
// --- Transfer Lock ---
@Column({ type: 'uuid', nullable: true })
pendingTransferRequestId: string | null;

@ManyToOne(() => TransferRequest, { nullable: true, eager: false, onDelete: 'SET NULL' })
@JoinColumn({ name: 'pending_transfer_request_id' })
pendingTransferRequest: TransferRequest | null;
```

Also add `ManyToOne` and `JoinColumn` to the existing TypeORM import line at the top of the file if not already present (they are already imported based on line 1-11 of the entity).

- [ ] **Step 3: Restart API and verify column is created**

Run: `cd inventory-api && npm run start:dev`

Expected: TypeORM log shows `ALTER TABLE "items" ADD COLUMN "pending_transfer_request_id" uuid` (or similar). No errors.

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/items/entities/item.entity.ts
git commit -m "feat: add pendingTransferRequestId FK to items table"
```

---

## Task 3: Update createRequest — set FK on item

**Files:**
- Modify: `inventory-api/src/items/transfer-requests.service.ts`

- [ ] **Step 1: Update createRequest() to set FK after saving request**

In `transfer-requests.service.ts`, the current `createRequest()` method (lines 24-56) saves the request but never sets `pendingTransferRequestId` on the item. Replace the method with:

```typescript
async createRequest(userId: string, itemId: string, dto: any) {
  const item = await this.itemsRepo.findOne({ where: { id: itemId } });
  if (!item) throw new NotFoundException('Item not found');

  if (item.pendingTransferRequestId) {
    throw new ConflictException('This asset already has a pending transfer request');
  }

  const request = this.transferRequestRepo.create({
    itemId,
    requestedByUserId: userId,
    targetType: dto.targetType,
    newAssignedToName: dto.newAssignedToName,
    newAssignedToEmployeeId: dto.newAssignedToEmployeeId,
    newDepartmentId: dto.newDepartmentId,
    newCompanyId: dto.newCompanyId,
    reason: dto.reason || 'Transfer request',
    status: TransferRequestStatus.PENDING,
  });

  await this.transferRequestRepo.save(request);

  // Lock the item
  item.pendingTransferRequestId = request.id;
  await this.itemsRepo.save(item);

  // Notify all SUPER_ADMINs + users with APPROVE_TRANSFERS
  await this.notificationsService.broadcastToPrivilegedUsers(AdminPermission.APPROVE_TRANSFERS, {
    type: NotificationType.TRANSFER_REQUEST_SUBMITTED,
    title: 'Transfer Request Submitted',
    message: `A transfer request for ${item.name} has been submitted.`,
    entityType: 'TransferRequest',
    entityId: request.id,
    actionUrl: `/transfers`,
  });

  return request;
}
```

Add `ConflictException` and `ForbiddenException` to the NestJS imports at line 1, and add `AdminPermission` to the enums import:

```typescript
import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
// ...existing imports...
import { AdminPermission, NotificationType } from '../common/enums';
```

- [ ] **Step 2: Commit**

```bash
git add inventory-api/src/items/transfer-requests.service.ts
git commit -m "feat: lock item on transfer request creation"
```

---

## Task 4: Update approveRequest — clear FK after assignment

**Files:**
- Modify: `inventory-api/src/items/transfer-requests.service.ts`

- [ ] **Step 1: Update approveRequest() to clear the FK**

The existing `approveRequest()` (lines 66-116) performs the assignment but never clears `pendingTransferRequestId`. After the assignment block (after the `if/else if` chain that calls `itemsService.assign()`), add:

```typescript
// Unlock the item
const lockedItem = await this.itemsRepo.findOne({ where: { id: request.itemId } });
if (lockedItem) {
  lockedItem.pendingTransferRequestId = null;
  await this.itemsRepo.save(lockedItem);
}
```

Place this before the "Notify Requestor" block. The full updated method:

```typescript
async approveRequest(id: string, adminId: string, notes?: string) {
  const request = await this.transferRequestRepo.findOne({ where: { id }, relations: ['item'] });
  if (!request) throw new NotFoundException('Transfer request not found');
  if (request.status !== TransferRequestStatus.PENDING) {
    throw new ConflictException('This request has already been resolved');
  }

  request.status = TransferRequestStatus.APPROVED;
  request.reviewedByUserId = adminId;
  request.reviewNotes = notes || null;
  await this.transferRequestRepo.save(request);

  // Unlock BEFORE assign (assign uses a transaction that re-fetches the item)
  await this.itemsRepo.update(request.itemId, { pendingTransferRequestId: null });

  // Perform the transfer
  if (request.targetType === TransferTargetType.PERSON) {
    await this.itemsService.assign(request.itemId, {
      assignedToName: request.newAssignedToName || undefined,
      assignedToEmployeeId: request.newAssignedToEmployeeId || undefined,
      departmentId: request.item.departmentId || undefined,
      notes: request.reason,
    }, adminId);
  } else if (request.targetType === TransferTargetType.DEPARTMENT) {
    await this.itemsService.assign(request.itemId, {
      departmentId: request.newDepartmentId || undefined,
      assignedToName: undefined,
      assignedToEmployeeId: undefined,
      notes: request.reason,
    }, adminId);
  } else if (request.targetType === TransferTargetType.COMPANY && request.newCompanyId) {
    request.item.companyId = request.newCompanyId;
    request.item.assignedToName = null;
    request.item.assignedToEmployeeId = null;
    request.item.departmentId = null;
    await this.itemsRepo.save(request.item);
  }

  // Notify Requestor
  await this.notificationsService.create({
    recipientUserId: request.requestedByUserId,
    type: NotificationType.TRANSFER_REQUEST_APPROVED,
    title: 'Transfer Request Approved',
    message: `Your transfer request for ${request.item.name} has been approved and the asset has been reassigned.`,
    entityType: 'TransferRequest',
    entityId: request.id,
    actionUrl: `/items/${request.item.id}`,
  });

  return request;
}
```

Note: `itemsRepo.update()` does a direct SQL UPDATE and bypasses the lock guard in `ItemsService.assign()` — which is correct here because the approve flow is the one that should override the lock.

- [ ] **Step 2: Commit**

```bash
git add inventory-api/src/items/transfer-requests.service.ts
git commit -m "feat: clear item lock on transfer approval"
```

---

## Task 5: Update rejectRequest — clear FK + send resubmit metadata

**Files:**
- Modify: `inventory-api/src/items/transfer-requests.service.ts`

- [ ] **Step 1: Update rejectRequest() to clear FK and include resubmit metadata**

Replace the existing `rejectRequest()` method (lines 118-140):

```typescript
async rejectRequest(id: string, adminId: string, notes: string) {
  const request = await this.transferRequestRepo.findOne({ where: { id }, relations: ['item'] });
  if (!request) throw new NotFoundException('Transfer request not found');
  if (request.status !== TransferRequestStatus.PENDING) {
    throw new ConflictException('This request has already been resolved');
  }

  request.status = TransferRequestStatus.REJECTED;
  request.reviewedByUserId = adminId;
  request.reviewNotes = notes;
  await this.transferRequestRepo.save(request);

  // Unlock the item
  await this.itemsRepo.update(request.itemId, { pendingTransferRequestId: null });

  // Notify Requestor with resubmit metadata
  await this.notificationsService.create({
    recipientUserId: request.requestedByUserId,
    type: NotificationType.TRANSFER_REQUEST_REJECTED,
    title: 'Transfer Request Rejected',
    message: `Your transfer request for ${request.item.name} was rejected: ${notes}`,
    entityType: 'TransferRequest',
    entityId: request.id,
    actionUrl: `/employees`,
    metadata: {
      itemId: request.itemId,
      itemName: request.item.name,
      itemBarcode: request.item.barcode,
      targetType: request.targetType,
      newAssignedToName: request.newAssignedToName,
      newAssignedToEmployeeId: request.newAssignedToEmployeeId,
      reason: request.reason,
    },
  });

  return request;
}
```

- [ ] **Step 2: Update NotificationsService.create() to accept metadata**

In `inventory-api/src/notifications/notifications.service.ts`, the `CreateNotificationPayload` interface is at lines 12-22. Add `metadata` to it:

```typescript
interface CreateNotificationPayload {
  recipientUserId: string;
  companyId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, any> | null;
}
```

The `create()` method at line 38 uses `...payload` spread into `notificationRepo.create()`, so `metadata` is automatically persisted — no other changes needed in the method body.

- [ ] **Step 3: Commit**

```bash
git add inventory-api/src/items/transfer-requests.service.ts inventory-api/src/notifications/notifications.service.ts
git commit -m "feat: clear lock on rejection + add resubmit metadata to notification"
```

---

## Task 6: Add cancelRequest() and getHistory() to service + controller

**Files:**
- Modify: `inventory-api/src/items/transfer-requests.service.ts`
- Modify: `inventory-api/src/items/transfer-requests.controller.ts`

- [ ] **Step 1: Add cancelRequest() method to service**

Append to `transfer-requests.service.ts` before the closing `}` of the class:

```typescript
async cancelRequest(itemId: string, userId: string) {
  const request = await this.transferRequestRepo.findOne({
    where: { itemId, status: TransferRequestStatus.PENDING },
  });
  if (!request) throw new NotFoundException('No pending transfer request found for this item');
  if (request.requestedByUserId !== userId) {
    throw new ForbiddenException('You can only cancel your own requests');
  }

  request.status = TransferRequestStatus.CANCELLED;
  await this.transferRequestRepo.save(request);

  // Unlock the item
  await this.itemsRepo.update(itemId, { pendingTransferRequestId: null });

  return { success: true };
}
```

- [ ] **Step 2: Add getHistory() method to service**

```typescript
async getHistory(page = 1, limit = 20) {
  const [items, total] = await this.transferRequestRepo.findAndCount({
    where: [
      { status: TransferRequestStatus.APPROVED },
      { status: TransferRequestStatus.REJECTED },
      { status: TransferRequestStatus.CANCELLED },
    ],
    relations: ['item', 'requestedByUser', 'reviewedByUser'],
    order: { updatedAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { items, total, page, limit };
}
```

- [ ] **Step 3: Add endpoints to controller**

In `transfer-requests.controller.ts`, add the missing imports and two new endpoints. Replace the full file:

```typescript
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TransferRequestsService } from './transfer-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AdminPermission } from '../common/enums';

@Controller('transfer-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransferRequestsController {
  constructor(private readonly transferRequestsService: TransferRequestsService) {}

  @Post(':itemId')
  @Permissions(AdminPermission.REQUEST_TRANSFERS)
  async createRequest(
    @Param('itemId') itemId: string,
    @Body() dto: any,
    @Request() req: any
  ) {
    return this.transferRequestsService.createRequest(req.user.sub, itemId, dto);
  }

  @Get('pending')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async getPendingRequests() {
    return this.transferRequestsService.getPendingRequests();
  }

  @Get('history')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async getHistory(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.transferRequestsService.getHistory(Number(page), Number(limit));
  }

  @Patch(':id/approve')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async approveRequest(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any
  ) {
    return this.transferRequestsService.approveRequest(id, req.user.sub, notes);
  }

  @Patch(':id/reject')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async rejectRequest(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any
  ) {
    return this.transferRequestsService.rejectRequest(id, req.user.sub, notes);
  }

  @Delete(':itemId/cancel')
  @Permissions(AdminPermission.REQUEST_TRANSFERS)
  async cancelRequest(
    @Param('itemId') itemId: string,
    @Request() req: any
  ) {
    return this.transferRequestsService.cancelRequest(itemId, req.user.sub);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/items/transfer-requests.service.ts inventory-api/src/items/transfer-requests.controller.ts
git commit -m "feat: add cancelRequest and getHistory endpoints"
```

---

## Task 7: Add lock guards to ItemsService

**Files:**
- Modify: `inventory-api/src/items/items.service.ts`

- [ ] **Step 1: Guard assign() — block if item is locked**

In `items.service.ts`, inside the `assign()` method's transaction callback, after the `item` is fetched (line 348) and after the existing terminal-status guards (after line 362), add:

```typescript
if (item.pendingTransferRequestId) {
  throw new ConflictException('Asset is locked — a transfer request is pending');
}
```

Add `ConflictException` to the NestJS imports at the top of the file if not already present.

- [ ] **Step 2: Guard update() — block if item is locked**

In `update()` (line 274), after `if (!item) throw new NotFoundException(...)` (line 277), add:

```typescript
if (item.pendingTransferRequestId) {
  throw new ConflictException('Asset is locked — a transfer request is pending');
}
```

- [ ] **Step 3: Guard unassign() — block if item is locked**

In `unassign()` (line 494), after `if (!item) throw new NotFoundException(...)` (line 497), add:

```typescript
if (item.pendingTransferRequestId) {
  throw new ConflictException('Asset is locked — a transfer request is pending');
}
```

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/items/items.service.ts
git commit -m "feat: block assign/update/unassign on locked items"
```

---

## Task 8: Include pendingTransferRequest in employee items query

**Files:**
- Modify: `inventory-api/src/items/items.service.ts`

- [ ] **Step 1: Find the getEmployeeGroups() method**

Search `items.service.ts` for `getEmployeeGroups` or the method that serves `GET /items/employees`. Add `pendingTransferRequest` to its TypeORM relations array.

For example, if the query uses `find()` with relations:

```typescript
relations: [
  'category', 'company', 'department',
  'pendingTransferRequest',  // ← add this
],
```

Or if it uses a QueryBuilder, add:

```typescript
.leftJoinAndSelect('item.pendingTransferRequest', 'pendingTransferRequest')
```

The pendingTransferRequest only needs: `id`, `newAssignedToName`, `newAssignedToEmployeeId`, `targetType`, `requestedByUserId`. These are loaded automatically via the relation.

- [ ] **Step 2: Commit**

```bash
git add inventory-api/src/items/items.service.ts
git commit -m "feat: include pendingTransferRequest relation in employee items query"
```

---

## Task 9: Frontend — update Item interface + create transfer-requests service

**Files:**
- Modify: `inventory-UI/src/services/item.service.ts`
- Create: `inventory-UI/src/services/transfer-requests.service.ts`

- [ ] **Step 1: Add pendingTransferRequestId and pendingTransferRequest to Item interface**

In `inventory-UI/src/services/item.service.ts`, extend the `Item` interface (lines 5-34) with:

```typescript
pendingTransferRequestId?: string | null;
pendingTransferRequest?: {
  id: string;
  newAssignedToName: string | null;
  newAssignedToEmployeeId: string | null;
  targetType: string;
  requestedByUserId: string;
} | null;
```

- [ ] **Step 2: Create transfer-requests.service.ts**

Create `inventory-UI/src/services/transfer-requests.service.ts`:

```typescript
import api from './api.client';

export interface PendingTransferRequest {
  id: string;
  itemId: string;
  targetType: 'PERSON' | 'DEPARTMENT' | 'COMPANY';
  newAssignedToName: string | null;
  newAssignedToEmployeeId: string | null;
  reason: string;
  requestedByUserId: string;
  requestedByUser: { id: string; name: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    name: string;
    barcode: string;
    assignedToName: string | null;
    assignedToEmployeeId: string | null;
  };
}

export const transferRequestsService = {
  getPending: async (): Promise<PendingTransferRequest[]> => {
    const { data } = await api.get('/transfer-requests/pending');
    return data;
  },

  getHistory: async (page = 1, limit = 20) => {
    const { data } = await api.get('/transfer-requests/history', { params: { page, limit } });
    return data;
  },

  approve: async (id: string, notes?: string) => {
    const { data } = await api.patch(`/transfer-requests/${id}/approve`, { notes });
    return data;
  },

  reject: async (id: string, notes: string) => {
    const { data } = await api.patch(`/transfer-requests/${id}/reject`, { notes });
    return data;
  },

  cancel: async (itemId: string) => {
    const { data } = await api.delete(`/transfer-requests/${itemId}/cancel`);
    return data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add inventory-UI/src/services/item.service.ts inventory-UI/src/services/transfer-requests.service.ts
git commit -m "feat: update Item type + add transfer-requests frontend service"
```

---

## Task 10: Update TransferRequestModal with prefill prop

**Files:**
- Modify: `inventory-UI/src/features/employees/TransferRequestModal.tsx`

- [ ] **Step 1: Add prefill prop and initialise state from it**

The modal currently takes `{ item, isOpen, onClose }`. Add an optional `prefill` prop and initialise the form state from it. Replace the `Props` interface and `useState` calls (lines 19-30):

```typescript
interface Prefill {
  targetType?: 'PERSON' | 'DEPARTMENT';
  newAssignedToName?: string;
  newAssignedToEmployeeId?: string;
  reason?: string;
}

interface Props {
  item: Pick<Item, 'id' | 'name' | 'barcode' | 'assignedToName'>;
  isOpen: boolean;
  onClose: () => void;
  prefill?: Prefill;
}

export default function TransferRequestModal({ item, isOpen, onClose, prefill }: Props) {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<'PERSON' | 'DEPARTMENT' | 'COMPANY'>(prefill?.targetType || 'PERSON');
  const [newAssignedToName, setNewAssignedToName] = useState(prefill?.newAssignedToName || '');
  const [newAssignedToEmployeeId, setNewAssignedToEmployeeId] = useState(prefill?.newAssignedToEmployeeId || '');
  const [reason, setReason] = useState(prefill?.reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
```

Also update the success toast and query invalidation so the employee query is also refreshed:

```typescript
toast.success('Transfer request submitted — pending admin approval');
queryClient.invalidateQueries({ queryKey: ['items'] });
queryClient.invalidateQueries({ queryKey: ['employees'] });
```

- [ ] **Step 2: Commit**

```bash
git add inventory-UI/src/features/employees/TransferRequestModal.tsx
git commit -m "feat: add prefill prop to TransferRequestModal"
```

---

## Task 11: EmployeesPage — locked state UI + Cancel Request + resubmit flow

**Files:**
- Modify: `inventory-UI/src/features/employees/EmployeesPage.tsx`

- [ ] **Step 1: Add useLocation import and resubmit state**

At the top of `EmployeesPage.tsx`, add to imports:

```typescript
import { useLocation } from 'react-router-dom';
import api from '@/services/api.client';
```

Inside the component, after the existing state declarations (after line ~40), add:

```typescript
const location = useLocation();
const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
const [resubmitPrefill, setResubmitPrefill] = useState<any>(null);
```

- [ ] **Step 2: Auto-open modal from router state (resubmit flow)**

After the existing state declarations, add a `useEffect`:

```typescript
useEffect(() => {
  const state = location.state as any;
  if (state?.resubmitTransfer) {
    const prefill = state.resubmitTransfer;
    setResubmitPrefill(prefill);
    // Create a minimal item object from metadata so the modal can render
    setTransferItem({
      id: prefill.itemId,
      name: prefill.itemName,
      barcode: prefill.itemBarcode,
      assignedToName: null,
    } as any);
    setIsTransferRequestModalOpen(true);
    // Clear the router state so refreshing doesn't re-open
    window.history.replaceState({}, '');
  }
}, []);
```

- [ ] **Step 3: Add handleCancelRequest function**

After `handleTransferClick` (after line 205), add:

```typescript
const handleCancelRequest = async (item: Item) => {
  if (!window.confirm(`Cancel the pending transfer request for "${item.name}"? The asset will be unlocked.`)) return;
  setCancellingItemId(item.id);
  try {
    await api.delete(`/transfer-requests/${item.id}/cancel`);
    toast.success('Transfer request cancelled — asset unlocked');
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to cancel request');
  } finally {
    setCancellingItemId(null);
  }
};
```

- [ ] **Step 4: Update the asset table row to show locked state**

Find the part of the JSX that renders the "Request Transfer" button for each item in the employee detail view. This will be inside the assets table, typically in the `ACTIONS` column. Replace/wrap the existing button rendering logic with:

```tsx
{item.pendingTransferRequestId ? (
  // LOCKED STATE
  <>
    <button
      disabled
      title="Locked — transfer pending"
      style={{
        padding: '4px 8px', background: 'rgba(80,80,80,0.15)', color: '#555',
        border: '1px solid rgba(80,80,80,0.2)', borderRadius: 6, fontSize: 11, cursor: 'not-allowed'
      }}
    >
      Edit
    </button>
    <button
      disabled
      title="Locked — transfer pending"
      style={{
        padding: '4px 8px', background: 'rgba(80,80,80,0.15)', color: '#555',
        border: '1px solid rgba(80,80,80,0.2)', borderRadius: 6, fontSize: 11, cursor: 'not-allowed'
      }}
    >
      Return
    </button>
    <button
      onClick={() => handleCancelRequest(item)}
      disabled={cancellingItemId === item.id}
      style={{
        padding: '4px 10px',
        background: 'rgba(244, 67, 54, 0.12)',
        color: '#f44336',
        border: '1px solid rgba(244, 67, 54, 0.3)',
        borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer'
      }}
    >
      {cancellingItemId === item.id ? 'Cancelling...' : 'Cancel Request'}
    </button>
  </>
) : (
  // NORMAL STATE — existing buttons unchanged
  // ... existing Edit, Return, Request Transfer buttons here ...
)}
```

Also add the amber row highlight. Find where the `<tr>` or row container is for each asset and add a conditional style:

```tsx
style={item.pendingTransferRequestId ? {
  background: 'rgba(240, 165, 0, 0.04)',
  borderLeft: '2px solid rgba(240, 165, 0, 0.4)'
} : {}}
```

And add the "Transfer Pending" badge next to the item name:

```tsx
{item.pendingTransferRequestId && (
  <span style={{
    marginLeft: 8, padding: '2px 8px',
    background: 'rgba(240, 165, 0, 0.15)',
    color: '#f0a500',
    border: '1px solid rgba(240, 165, 0, 0.3)',
    borderRadius: 10, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap'
  }}>
    ⏳ Pending → {item.pendingTransferRequest?.newAssignedToName || 'transfer'}
  </span>
)}
```

- [ ] **Step 5: Pass prefill and clear on close to TransferRequestModal**

Update the `TransferRequestModal` usage (lines 576-581) to pass prefill:

```tsx
{transferItem && isTransferRequestModalOpen && (
  <TransferRequestModal
    item={transferItem}
    isOpen={isTransferRequestModalOpen}
    prefill={resubmitPrefill || undefined}
    onClose={() => {
      setIsTransferRequestModalOpen(false);
      setTransferItem(null);
      setResubmitPrefill(null);
    }}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add inventory-UI/src/features/employees/EmployeesPage.tsx
git commit -m "feat: locked asset UI, Cancel Request button, resubmit from notification"
```

---

## Task 12: Create TransfersPage

**Files:**
- Create: `inventory-UI/src/features/transfers/TransfersPage.tsx`

- [ ] **Step 1: Create the directory and page file**

Create `inventory-UI/src/features/transfers/TransfersPage.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { transferRequestsService, PendingTransferRequest } from '@/services/transfer-requests.service';
import { formatDistanceToNow } from 'date-fns';

function EmployeeAvatar({ name, color }: { name: string; color?: string }) {
  const initials = name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';
  const bg = color || '#f0a500';
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: bg, color: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

function RejectModal({ request, onClose, onConfirm }: {
  request: PendingTransferRequest;
  onClose: () => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-dark)', padding: 24 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800 }}>Reject Transfer Request</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
          Rejecting transfer of <strong>{request.item.name}</strong> to <strong>{request.newAssignedToName || 'department'}</strong>.
        </p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          Reason for rejection <span style={{ color: '#e11d48' }}>*</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Explain why this transfer is being rejected..."
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: 14, outline: 'none', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => notes.trim() && onConfirm(notes)}
            disabled={!notes.trim()}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: notes.trim() ? '#f44336' : '#444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: notes.trim() ? 'pointer' : 'not-allowed' }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [rejectTarget, setRejectTarget] = useState<PendingTransferRequest | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['transfer-requests', 'pending'],
    queryFn: transferRequestsService.getPending,
    enabled: tab === 'pending',
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['transfer-requests', 'history'],
    queryFn: () => transferRequestsService.getHistory(),
    enabled: tab === 'history',
  });

  const history = historyData?.items || [];

  const handleApprove = async (req: PendingTransferRequest) => {
    if (!window.confirm(`Approve transfer of "${req.item.name}" to ${req.newAssignedToName || 'department'}?`)) return;
    setActionId(req.id);
    try {
      await transferRequestsService.approve(req.id);
      toast.success(`Transfer approved — asset reassigned to ${req.newAssignedToName || 'department'}`);
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (notes: string) => {
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    try {
      await transferRequestsService.reject(rejectTarget.id, notes);
      toast.success('Transfer request rejected');
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionId(null);
      setRejectTarget(null);
    }
  };

  const statusColors: Record<string, string> = {
    APPROVED: '#4caf50',
    REJECTED: '#f44336',
    CANCELLED: '#888',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 40 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          Transfer Requests
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
          Review and approve asset transfer requests from IT Support.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['pending', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: tab === t ? 'none' : '1px solid var(--border-dark)',
              background: tab === t ? 'var(--accent-yellow)' : 'transparent',
              color: tab === t ? '#000' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t === 'pending' ? 'Pending' : 'History'}
            {t === 'pending' && pending.length > 0 && (
              <span style={{ background: '#000', color: 'var(--accent-yellow)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Tab */}
      {tab === 'pending' && (
        <>
          {pendingLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : pending.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <ArrowLeftRight size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No pending transfer requests</div>
              <div style={{ fontSize: 13 }}>All requests have been reviewed.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    {['Asset', 'Current Holder', 'Transfer To', 'Reason', 'Requested By', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700 }}>{req.item.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{req.item.barcode}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <EmployeeAvatar name={req.item.assignedToName || '?'} color="#f0a500" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{req.item.assignedToName || '—'}</div>
                            {req.item.assignedToEmployeeId && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{req.item.assignedToEmployeeId}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <EmployeeAvatar name={req.newAssignedToName || 'Dept'} color="#4caf50" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{req.newAssignedToName || 'Department transfer'}</div>
                            {req.newAssignedToEmployeeId && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{req.newAssignedToEmployeeId}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px', maxWidth: 180 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                          {req.reason}
                        </div>
                      </td>
                      <td style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {req.requestedByUser?.name || '—'}
                      </td>
                      <td style={{ padding: '14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDistanceToNow(new Date(req.createdAt))} ago
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={actionId === req.id}
                            style={{ padding: '5px 12px', background: 'rgba(76, 175, 80, 0.12)', color: '#4caf50', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(req)}
                            disabled={actionId === req.id}
                            style={{ padding: '5px 12px', background: 'rgba(244, 67, 54, 0.12)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No history yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    {['Asset', 'Transferred To', 'Reason', 'Requested By', 'Status', 'Notes', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((req: PendingTransferRequest) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{req.item?.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{req.item?.barcode}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12 }}>{req.newAssignedToName || 'Department'}</td>
                      <td style={{ padding: '12px 14px', maxWidth: 160 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>{req.reason}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{req.requestedByUser?.name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: `${statusColors[req.status]}20`, color: statusColors[req.status] || '#aaa', border: `1px solid ${statusColors[req.status] || '#aaa'}40` }}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 160 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reviewNotes || ''}>{req.reviewNotes || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDistanceToNow(new Date(req.updatedAt))} ago
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add inventory-UI/src/features/transfers/TransfersPage.tsx
git commit -m "feat: add TransfersPage for admin transfer request review"
```

---

## Task 13: Sidebar nav item + Router route

**Files:**
- Modify: `inventory-UI/src/components/layout/Sidebar.tsx`
- Modify: `inventory-UI/src/router/index.tsx`

- [ ] **Step 1: Add Transfers nav item to Sidebar**

In `Sidebar.tsx`, add `ArrowLeftRight` to the lucide-react import (line 6):

```typescript
import {
  LayoutDashboard, Building2, Network, Users, PackageSearch,
  Tag, BarChart3, ListTodo, Settings, X, UserCheck, Trash2,
  ClipboardCheck, ArrowLeftRight
} from 'lucide-react';
```

In the `MENU_ITEMS` array (line 34), add the Transfers entry between Gate Passes and Disposals:

```typescript
{ path: '/gate-passes', label: 'GATE PASSES', icon: ClipboardCheck, anyPermission: [AdminPermission.CREATE_GATE_PASS, AdminPermission.APPROVE_GATE_PASS] },
{ path: '/transfers', label: 'TRANSFERS', icon: ArrowLeftRight, anyPermission: [AdminPermission.APPROVE_TRANSFERS] },
{ path: '/disposals', label: 'DISPOSALS', icon: Trash2, anyPermission: [AdminPermission.MANAGE_DISPOSALS, AdminPermission.APPROVE_DISPOSAL_L1, AdminPermission.APPROVE_DISPOSAL_L2, AdminPermission.REQUEST_DISPOSAL] },
```

Note: `anyPermission: [AdminPermission.APPROVE_TRANSFERS]` already passes for SUPER_ADMIN because `hasPermission()` returns `true` for all permissions when the user is SUPER_ADMIN.

- [ ] **Step 2: Add /transfers route to router**

In `inventory-UI/src/router/index.tsx`, add the lazy import with the other lazy imports:

```typescript
const TransfersPage = lazyWithRetry(() => import('@/features/transfers/TransfersPage'));
```

In the protected routes children array, add after the gate-passes route:

```typescript
{ path: '/gate-passes', element: <GatePassesPage /> },
{ path: '/transfers', element: <TransfersPage /> },
```

- [ ] **Step 3: Commit**

```bash
git add inventory-UI/src/components/layout/Sidebar.tsx inventory-UI/src/router/index.tsx
git commit -m "feat: add Transfers nav item and /transfers route"
```

---

## Task 14: Notification store sync + Resubmit button in TopNavbar

**Files:**
- Modify: `inventory-UI/src/store/notification.store.ts`
- Modify: `inventory-UI/src/components/layout/TopNavbar.tsx`

- [ ] **Step 1: Sync transfer-requests query in notification store**

In `notification.store.ts`, inside the `socket.on('new_notification', ...)` handler (around line 82), add a sync block for transfer notifications:

```typescript
// Sync Transfer Requests
if (type.startsWith('TRANSFER_REQUEST_')) {
  queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
  queryClient.invalidateQueries({ queryKey: ['employees'] });
}
```

Place this after the existing `DISPOSAL_` sync block (around line 91).

- [ ] **Step 2: Add Resubmit button for rejected notifications in TopNavbar**

In `TopNavbar.tsx`, add `useNavigate` to the react-router-dom imports (it's likely already imported — verify).

Inside the notification list render loop (around lines 378-423), after the dismiss button and inside the notification item, add a conditional Resubmit button. Find the `<div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>` line that shows the time (line 407) and after it add:

```tsx
{n.type === 'TRANSFER_REQUEST_REJECTED' && n.metadata && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (!n.isRead) markAsRead(n.id);
      setNotifOpen(false);
      navigate('/employees', { state: { resubmitTransfer: n.metadata } });
    }}
    style={{
      marginTop: 6, padding: '4px 12px',
      background: 'rgba(59, 130, 246, 0.12)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer'
    }}
  >
    Resubmit Request
  </button>
)}
```

- [ ] **Step 3: Commit**

```bash
git add inventory-UI/src/store/notification.store.ts inventory-UI/src/components/layout/TopNavbar.tsx
git commit -m "feat: sync transfer queries on notifications + Resubmit button"
```

---

## Final Check

- [ ] **Start both servers and verify the full flow:**

  1. As IT Support: go to Employees → pick an employee → click "Request Transfer" on an asset → submit
  2. Verify: asset row shows amber highlight + "⏳ Pending →" badge + disabled Edit/Return + "Cancel Request" button
  3. Verify: SUPER_ADMIN receives a notification linking to `/transfers`
  4. As Admin: go to Transfers page → approve one request → verify asset is reassigned in employee view + unlocked
  5. As Admin: reject a second request with notes → verify IT Support receives rejection notification with "Resubmit Request" button
  6. Click "Resubmit Request" → verify navigation to `/employees` opens pre-filled TransferRequestModal
  7. As IT Support: click "Cancel Request" on a pending item → confirm → verify asset unlocks
  8. As Admin: go to History tab → verify approved/rejected/cancelled requests appear

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete transfer request locking — full flow working"
```
