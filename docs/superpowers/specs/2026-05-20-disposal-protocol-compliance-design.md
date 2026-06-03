# Disposal Protocol Compliance — Design Spec
**Date:** 2026-05-20  
**Status:** Approved  

---

## Context

The IT Equipment Disposal Guideline & Protocol requires a 3-step approval chain before any asset can be marked disposed. The current system allows any single ADMIN with `MANAGE_DISPOSALS` to dispose an asset in one click — bypassing every step of the protocol. This spec covers all fixes required to make the system enforce the protocol end-to-end.

---

## Problems Being Solved

| # | Issue | Severity |
|---|---|---|
| 1 | No request → review → approve workflow | Critical |
| 2 | `disposalApprovedByName` records executor, not final approver | Critical |
| 3 | No data security checklist enforcement at disposal | Critical |
| 4 | No structured technical evaluation step | High |
| 5 | Missing `RETURNED_TO_VENDOR` disposal method | Medium |
| 6 | Items in any status can be disposed without evaluation | Medium |
| 7 | No photo/document evidence attachment | Medium |
| 8 | Misleading UI text ("archived") | Low |
| 9 | `disposalMethod` silently defaults to `SCRAPPED` | Low |

---

## Permissions

Three new entries added to `AdminPermission` enum:

| Permission | Role level | Purpose |
|---|---|---|
| `REQUEST_DISPOSAL` | IT Support (any ADMIN) | Submit a disposal request for an asset |
| `APPROVE_DISPOSAL_L1` | IT Manager | Review and recommend (or reject) a request |
| `APPROVE_DISPOSAL_L2` | Director Finance | Final approval + data security checklist sign-off |

`MANAGE_DISPOSALS` is repurposed: read access to all disposal requests and their history (no longer grants the ability to execute disposal directly).

`SUPER_ADMIN` retains emergency direct-dispose via the existing `POST /items/:id/dispose` endpoint, with a forced `emergencyBypass: true` flag written to the audit trail.

---

## Data Model — `DisposalRequest` Entity

New table: `disposal_requests`

### Fields

**Identity**
- `id` — uuid PK
- `itemId` — uuid FK → items
- `companyId` — uuid FK → companies

**Step 1 — Request (IT Support)**
- `requestedByUserId` — uuid FK → users
- `requestedAt` — timestamp
- `disposalReason` — string, required
- `disposalCondition` — enum: `BEYOND_REPAIR | OBSOLETE | UNUSED | PHYSICALLY_DAMAGED`
- `technicalEvaluation` — text (structured: issue description + repair attempts made)
- `proposedMethod` — enum: `SCRAPPED | DONATED | RECYCLED | RETURNED_TO_VENDOR | SOLD`
- `evidencePhotoUrls` — string[] (S3 keys, optional)
- `notes` — text, optional

**Step 2 — L1 Review (IT Manager)**
- `l1ReviewedByUserId` — uuid FK → users, nullable
- `l1ReviewedAt` — timestamp, nullable
- `l1Decision` — enum: `RECOMMENDED | REJECTED`, nullable
- `l1Notes` — text, nullable

**Step 3 — Final Approval (Director Finance)**
- `l2ApprovedByUserId` — uuid FK → users, nullable
- `l2ApprovedAt` — timestamp, nullable
- `l2Decision` — enum: `APPROVED | REJECTED`, nullable
- `l2Notes` — text, nullable
- `l1Bypassed` — boolean, default false (true when L2 acts directly from PENDING_L1)
- `dataSecurityChecklist` — jsonb, structure:
  ```json
  {
    "businessDataBacked": false,
    "companyDataErased": false,
    "storageFormatted": false,
    "userAccountsRemoved": false,
    "removedFromDomain": false,
    "physicalDestructionDone": false
  }
  ```

**Overall state**
- `status` — enum: `PENDING_L1 | PENDING_L2 | APPROVED | REJECTED | CANCELLED`

### State Transitions

```
[PENDING_L1]
  → L1 RECOMMENDED  → [PENDING_L2]
  → L1 REJECTED     → [REJECTED]
  → L2 bypasses     → [APPROVED]  (l1Bypassed = true)
  → requester cancels → [CANCELLED]

[PENDING_L2]
  → L2 APPROVED     → [APPROVED]  (triggers item disposal atomically)
  → L2 REJECTED     → [REJECTED]
```

### On Final Approval (atomic transaction)
1. `Item.status` → `DISPOSED`
2. `Item.disposalApprovedByName` → L2 approver's name
3. `Item.disposalMethod` → `DisposalRequest.proposedMethod`
4. `Item.disposalReason` → `DisposalRequest.disposalReason`
5. `Item.disposalDate` → `l2ApprovedAt`
6. `ItemEvent` created: type `DISPOSED`, notes include whether L1 was bypassed
7. Notifications dispatched

---

## Enum Changes

### `DisposalMethod` (backend enum)
Add: `RETURNED_TO_VENDOR = 'RETURNED_TO_VENDOR'`  
Keep: `SCRAPPED`, `DONATED`, `RECYCLED`, `SOLD`

### `ItemEventType` (already defined, now used)
- `DISPOSAL_REQUESTED` — emitted on Step 1 submit
- `DISPOSAL_APPROVED` — emitted on final L2 approval

### `NotificationType` (already defined, now used)
- `DISPOSAL_REQUESTED` — sent to L1 + L2 users on submit
- `DISPOSAL_APPROVED` — sent on final approval

---

## API Endpoints

New module: `disposal-requests`

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `POST` | `/disposal-requests` | `REQUEST_DISPOSAL` | Submit a disposal request |
| `GET` | `/disposal-requests` | `MANAGE_DISPOSALS` | List requests (filter: status, company) |
| `GET` | `/disposal-requests/:id` | `MANAGE_DISPOSALS` | Get single request detail |
| `PATCH` | `/disposal-requests/:id/l1-review` | `APPROVE_DISPOSAL_L1` | L1 recommend or reject |
| `PATCH` | `/disposal-requests/:id/l2-approve` | `APPROVE_DISPOSAL_L2` | Final approval + checklist |
| `PATCH` | `/disposal-requests/:id/cancel` | `REQUEST_DISPOSAL` | Requester cancels own pending request |

### Server-side Guards
- Cannot submit if item already `DISPOSED`
- Cannot submit if item already has a `PENDING_L1` or `PENDING_L2` request open
- L1 reviewer cannot be the same user as the requester
- L2 approver cannot be the same user as the requester
- `l2-approve` rejects if any `dataSecurityChecklist` value is `false`
- `l1-review` is blocked if request is not in `PENDING_L1` state
- `l2-approve` is allowed from both `PENDING_L1` (bypass) and `PENDING_L2` states

### Photo Upload
Uses existing S3 upload infrastructure. Photos uploaded before form submit; S3 keys stored in `evidencePhotoUrls` array on the request.

---

## Notification Rules

| Trigger | Recipients | Channel |
|---|---|---|
| Request submitted | All `APPROVE_DISPOSAL_L1` + `APPROVE_DISPOSAL_L2` users (company-scoped) | In-app + email |
| L1 recommended | All `APPROVE_DISPOSAL_L2` users (company-scoped) | In-app + email |
| L1 rejected | Requester | In-app + email |
| L2 approved | Requester + all `MANAGE_DISPOSALS` users | In-app + email |
| L2 rejected | Requester + L1 reviewer (if L1 had reviewed) | In-app + email |

---

## Frontend Components

### Modified
- **`AssetDetailsDrawer`** — "Dispose" button replaced with "Request Disposal" for non-SUPER_ADMIN users with `REQUEST_DISPOSAL`. Shows a "Disposal Pending" badge if an open request exists. SUPER_ADMIN retains direct dispose button.
- **`DisposeModal`** — repurposed as `RequestDisposalModal`: structured form replacing the simple text field. Fields: disposal condition (required dropdown), technical evaluation (required textarea), proposed method (required dropdown — no silent default), photo upload (optional), notes (optional).

### New
- **`DisposalRequestsPage`** — new sidebar nav item. Filterable table of all requests with status badges. Visible to users with `MANAGE_DISPOSALS`, `APPROVE_DISPOSAL_L1`, or `APPROVE_DISPOSAL_L2`.
- **`DisposalRequestDetailDrawer`** — side drawer showing full request detail with a 3-step timeline. Each step shows actor name, timestamp, decision, and notes. If request is awaiting the current user's action, an action panel appears inline.
- **`L1ReviewPanel`** — embedded in detail drawer. Recommend/Reject radio + notes textarea + submit. Visible only when `status = PENDING_L1` and user has `APPROVE_DISPOSAL_L1`.
- **`L2ApprovalPanel`** — embedded in detail drawer. Data security checklist (all 6 items must be checked), decision radio, notes, submit. Visible when status is `PENDING_L1` or `PENDING_L2` and user has `APPROVE_DISPOSAL_L2`.

---

## Minor Fixes

| Issue | Fix |
|---|---|
| UI alert says "archived" | Change to "A disposal request will be submitted for review and approval." |
| `disposalMethod` silently defaults to SCRAPPED | No default — user must explicitly select a method; dropdown opens to placeholder |
| `disposalApprovedByName` stores executor | Now stores L2 approver name (set at final approval transaction) |

---

## Out of Scope

- Physical data wiping tooling (system records acknowledgment only, not execution)
- Disposal vendor tracking beyond the proposed method field
- Bulk disposal requests
- Disposal cost recording

---

## Implementation Phases

To be determined in the writing-plans stage. Rough order:
1. Backend: enum changes, `DisposalRequest` entity, new module + endpoints, notification wiring
2. Frontend: `RequestDisposalModal`, `DisposalRequestsPage`, detail drawer, action panels
3. Minor UI fixes (alert text, default method)
