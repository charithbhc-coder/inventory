# Gate Pass Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-permission approval workflow to gate passes, fix the random print reference number bug, remove gate pass UI from ItemsPage, and replace it with a dedicated Gate Passes page.

**Architecture:** Extend the existing `GatePass` entity with a `PENDING_APPROVAL` status and approval metadata columns. A new `CREATE_GATE_PASS` permission covers request creation; `APPROVE_GATE_PASS` covers approval, rejection, and return. A dedicated `/gate-passes` frontend page with role-aware views replaces the inline ItemsPage UI entirely.

**Tech Stack:** NestJS/TypeORM (backend), React 19 + TypeScript, TanStack Query v5, TanStack Table v8, Lucide React, react-hot-toast, inline styles with CSS variables (frontend).

---

## Status Flow

```
PENDING_APPROVAL → ACTIVE → RETURNED
                ↘ reject (notes added, stays PENDING_APPROVAL — requester edits & resubmits)
                ↘ CANCELLED (requester cancels own pending request)
```

Items remain `WAREHOUSE` on creation. They move to `IN_TRANSIT` only when an approver approves. On return, items go back to `WAREHOUSE` for normal reassignment.

---

## Permissions

| Permission | Who has it | What it allows |
|---|---|---|
| `CREATE_GATE_PASS` | Warehouse/IT staff | Create requests, append to active passes, cancel own pending requests |
| `APPROVE_GATE_PASS` | IT Manager / senior staff | Approve, reject, mark returned |

Segregation: the creator of a gate pass cannot approve it.

---

## Backend Changes

### 1. Enums (`inventory-api/src/common/enums/index.ts`)

Add to `AdminPermission`:
```typescript
CREATE_GATE_PASS = 'CREATE_GATE_PASS',
APPROVE_GATE_PASS = 'APPROVE_GATE_PASS',
```

Add to `GatePassStatus`:
```typescript
PENDING_APPROVAL = 'PENDING_APPROVAL',
```

### 2. Entity (`inventory-api/src/items/entities/gate-pass.entity.ts`)

New columns:
```typescript
@Column({ type: 'uuid' })
companyId: string;

@Column({ type: 'uuid', nullable: true })
approvedByUserId: string | null;

@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'approvedByUserId' })
approvedByUser: User | null;

@Column({ type: 'timestamp', nullable: true })
approvedAt: Date | null;

@Column({ type: 'text', nullable: true })
rejectionNotes: string | null;
```

Default status changes from `GatePassStatus.ACTIVE` to `GatePassStatus.PENDING_APPROVAL`.

### 3. DTOs (`inventory-api/src/items/dto/gate-pass.dto.ts`)

Add:
```typescript
export class ApproveGatePassDto {}  // no body needed

export class RejectGatePassDto {
  @IsString()
  @IsNotEmpty()
  rejectionNotes: string;
}
```

### 4. Service (`inventory-api/src/items/gate-passes.service.ts`)

**`create(dto, userId)`** — sets `status = PENDING_APPROVAL`, copies `companyId` from the first item, does NOT change item status or create ItemEvents. Returns saved gate pass.

**`approve(id, approverId, callerCompanyId?)`** — validates: status must be `PENDING_APPROVAL`, approver must not be the creator. Sets `status = ACTIVE`, `approvedByUserId`, `approvedAt`. Moves all items to `IN_TRANSIT`, creates `GATE_PASS_ISSUED` ItemEvents. Returns updated gate pass.

**`reject(id, dto, rejectorId, callerCompanyId?)`** — validates: status must be `PENDING_APPROVAL`, rejector must not be the creator. Sets `rejectionNotes`, leaves status as `PENDING_APPROVAL`. Returns updated gate pass.

**`cancel(id, userId, callerCompanyId?)`** — validates: status must be `PENDING_APPROVAL`, caller must be creator. Sets `status = CANCELLED`. Returns updated gate pass.

**`markReturned(id, dto, userId, callerCompanyId?)`** — validates: status must be `ACTIVE`. Sets `status = RETURNED`, moves items back to `WAREHOUSE`, creates `GATE_PASS_RETURNED` ItemEvents (unchanged logic, just adds companyId scoping).

**`append(id, dto, userId, callerCompanyId?)`** — validates: status must be `ACTIVE` (not PENDING_APPROVAL). Unchanged otherwise.

**`findAll(filters: { status?, companyId? })`** — replaces `findAllActive()`. Supports status filter + companyId scoping. Relations: `items`, `createdByUser`, `approvedByUser`.

**`findPending(callerCompanyId?)`** — returns all `PENDING_APPROVAL` passes, scoped by company.

**`findMyRequests(userId, callerCompanyId?)`** — returns passes where `createdByUserId = userId`, scoped by company.

### 5. Controller (`inventory-api/src/items/gate-passes.controller.ts`)

Add `RolesGuard`, `PermissionsGuard`, `CurrentUser` decorator. All routes require `UserRole.SUPER_ADMIN` or `UserRole.ADMIN`.

Route order (static before parameterized):

| Method | Route | Permission |
|---|---|---|
| `POST` | `/` | `CREATE_GATE_PASS` |
| `GET` | `/` | `APPROVE_GATE_PASS` | All passes with optional `?status=` filter (for Gate Passes page) |
| `GET` | `/pending` | `APPROVE_GATE_PASS` | Shorthand for `?status=PENDING_APPROVAL` |
| `GET` | `/my-requests` | `CREATE_GATE_PASS` |
| `GET` | `/active` | `APPROVE_GATE_PASS` | Shorthand for `?status=ACTIVE` (used by append dropdown) |
| `POST` | `/:id/approve` | `APPROVE_GATE_PASS` |
| `POST` | `/:id/reject` | `APPROVE_GATE_PASS` |
| `POST` | `/:id/cancel` | `CREATE_GATE_PASS` |
| `POST` | `/:id/append` | `CREATE_GATE_PASS` |
| `POST` | `/:id/return` | `APPROVE_GATE_PASS` |

SUPER_ADMIN sees all companies; ADMIN scoped to `user.companyId`.

### 6. Migration

TypeORM migration file in `inventory-api/src/migrations/`:
- Add `PENDING_APPROVAL` to `gate_pass_status_enum` postgres enum
- Add columns: `company_id uuid NOT NULL DEFAULT gen_random_uuid()` (then remove default after backfill), `approved_by_user_id uuid NULL`, `approved_at timestamp NULL`, `rejection_notes text NULL`
- Add column as nullable first: `ALTER TABLE gate_passes ADD COLUMN company_id uuid NULL`
- Backfill: `UPDATE gate_passes gp SET company_id = (SELECT i.company_id FROM items i WHERE i.gate_pass_id = gp.id LIMIT 1)`
- Make NOT NULL: `ALTER TABLE gate_passes ALTER COLUMN company_id SET NOT NULL`

---

## Frontend Changes

### 7. Types (`inventory-UI/src/types/index.ts` or equivalent)

Add `PENDING_APPROVAL` to `GatePassStatus` union.
Add `CREATE_GATE_PASS` and `APPROVE_GATE_PASS` to `AdminPermission` enum.

### 8. Gate Pass Service (`inventory-UI/src/services/gatePass.service.ts`)

Extend `GatePass` interface:
```typescript
companyId: string;
status: 'PENDING_APPROVAL' | 'ACTIVE' | 'RETURNED' | 'CANCELLED';
approvedByUserId?: string;
approvedAt?: string;
rejectionNotes?: string;
createdByUser: { id: string; firstName: string; lastName: string };
approvedByUser?: { id: string; firstName: string; lastName: string };
```

Add methods:
```typescript
getAll: async (filters?: { status?: string }): Promise<GatePass[]>  // calls GET /gate-passes?status=...
getMyRequests: async (): Promise<GatePass[]>
getOne: async (id: string): Promise<GatePass>
approve: async (id: string): Promise<GatePass>
reject: async (id: string, rejectionNotes: string): Promise<GatePass>
cancel: async (id: string): Promise<GatePass>
```

Keep `getActive()` calling `GET /gate-passes/active` — used only by the append dropdown in `CreateGatePassModal`.

### 9. formPrinter.ts (`inventory-UI/src/utils/formPrinter.ts`)

Add `referenceNo: string` to `GatePassInfo` interface:
```typescript
export interface GatePassInfo {
  referenceNo: string;   // add this
  destination: string;
  reason?: string;
  authorizedBy?: string;
}
```

In `printGatePassForm`, replace:
```typescript
<p class="meta"><span class="highlight">Pass No:</span> GP-${Math.floor(1000 + Math.random() * 9000)}</p>
```
with:
```typescript
<p class="meta"><span class="highlight">Pass No:</span> ${info.referenceNo}</p>
```

### 10. GatePassesPage.tsx (new — `inventory-UI/src/features/gate-passes/GatePassesPage.tsx`)

Role-aware view (same pattern as DisposalRequestsPage):
- `canApprove = hasPermission(APPROVE_GATE_PASS)`
- `isRequesterOnly = !canApprove && hasPermission(CREATE_GATE_PASS)`

**Approver view:**
- Page title: "Gate Passes"
- Status filter dropdown (default: `PENDING_APPROVAL`)
- Table: Reference No, Destination, Items (count), Requested By, Status badge, Date Submitted
- Data from `gatePassService.getAll({ status: statusFilter || undefined })` — calls `GET /gate-passes?status=...`

**Requester-only view:**
- Page title: "My Gate Pass Requests"
- No status filter
- Same table columns minus "Requested By"
- Data from `getMyRequests()`

Status badge styles:
```typescript
PENDING_APPROVAL: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Pending Approval' }
ACTIVE:           { bg: 'rgba(99,102,241,0.1)', color: '#818cf8', label: 'Active' }
RETURNED:         { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Returned' }
CANCELLED:        { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' }
```

New Request button (visible to `CREATE_GATE_PASS` users) → opens `CreateGatePassModal`.

### 11. CreateGatePassModal.tsx (new — `inventory-UI/src/features/gate-passes/CreateGatePassModal.tsx`)

Replaces the inline gate pass creation modal from ItemsPage. Contains:
- **Destination** dropdown (populated from company list — same companies the user has access to)
- **Reason** text input (required)
- **Authorized By** text input (optional free text — user who authorized the movement)
- **Item Picker** — searchable list of WAREHOUSE items for the user's company, multi-select with checkboxes. Fetches from `GET /items?status=WAREHOUSE`. Shows item name + barcode. Requires at least 1 item selected.

On submit: calls `gatePassService.create()`, shows toast "Gate pass submitted for approval", invalidates `['gate-passes']` query.

### 12. GatePassDetailDrawer.tsx (new — `inventory-UI/src/features/gate-passes/GatePassDetailDrawer.tsx`)

Right-side drawer (same pattern as DisposalRequestDetailDrawer). Fetches full gate pass via `GET /gate-passes/:id` (add this endpoint to backend).

**Header:** Reference No, status badge, date submitted.

**Details section:** Destination, reason, authorized by, submitted by, approved by (if applicable).

**Rejection banner:** If `status === PENDING_APPROVAL && rejectionNotes` — amber banner showing the rejection notes.

**Items list:** Table of all items on the pass (name, barcode, current status).

**Action buttons** (conditional):
- **Approve** — `APPROVE_GATE_PASS` + `PENDING_APPROVAL` + not creator → calls `approve()`, invalidates queries
- **Reject** — same conditions → inline textarea for rejection notes → calls `reject(id, notes)`
- **Cancel** — `CREATE_GATE_PASS` + own request + `PENDING_APPROVAL` → calls `cancel()`
- **Mark Returned** — `APPROVE_GATE_PASS` + `ACTIVE` → confirm dialog → calls `markReturned()`
- **Print** — always visible for ACTIVE/RETURNED passes → calls `printGatePassForm()` with actual `referenceNo`

### 13. Sidebar.tsx (`inventory-UI/src/components/layout/Sidebar.tsx`)

Add after ITEMS entry:
```typescript
{ path: '/gate-passes', label: 'GATE PASSES', icon: ClipboardCheck, anyPermission: [AdminPermission.CREATE_GATE_PASS, AdminPermission.APPROVE_GATE_PASS] },
```

Add `ClipboardCheck` to lucide-react imports.

### 14. PermissionsModal.tsx (`inventory-UI/src/features/users/PermissionsModal.tsx`)

Add new group after "Disposal Workflow":
```typescript
{
  category: 'Gate Pass Workflow',
  permissions: [
    { id: AdminPermission.CREATE_GATE_PASS, label: 'Create Requests', type: 'special' },
    { id: AdminPermission.APPROVE_GATE_PASS, label: 'Approve / Return', type: 'special' },
  ],
},
```

### 15. ItemsPage.tsx (`inventory-UI/src/features/items/ItemsPage.tsx`)

Remove entirely:
- `isGatePassModalOpen`, `gatePassMode`, `selectedGatePassId`, `gatePassDetails` state
- `isActiveGatePassesOpen` state
- `activeGatePasses` query
- `handleGenerateGatePass` function
- Gate Pass button in the toolbar
- Gate Pass modal JSX block
- Active Gate Passes tracker panel JSX block
- `printGatePassForm` import
- `gatePassService` import
- `GatePass` type import

Remove selection mode if it was only used for gate passes. If selection mode is also used for other operations, keep it and only remove the gate-pass-specific branch.

### 16. Router (`inventory-UI/src/App.tsx` or router file)

Add route: `<Route path="/gate-passes" element={<GatePassesPage />} />`

---

## Backend: Add GET /:id endpoint

Add to controller (between `active` and `/:id/*` routes):

```typescript
@Get(':id')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Permissions(AdminPermission.APPROVE_GATE_PASS, AdminPermission.CREATE_GATE_PASS)
findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
  return this.service.findOne(id, user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId);
}
```

Add `findOne(id, callerCompanyId?)` to service: fetches by id with all relations, enforces company scoping.

---

## What Does NOT Change

- `markReturned` logic (items → WAREHOUSE) — unchanged
- Asset assign flow — items back in WAREHOUSE are assigned via the normal AssignModal
- `append` logic — unchanged, just restricted to ACTIVE passes only
- All other ItemsPage functionality (repairs, disposals, assign, etc.)
