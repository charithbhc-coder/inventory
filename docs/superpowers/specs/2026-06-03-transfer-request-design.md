# Transfer Request Feature Design

**Date:** 2026-06-03
**Status:** Approved — ready for implementation

---

## Overview

IT Support staff can request that an assigned asset be transferred to another employee. The request must be approved by a Super Admin or any Admin with the `APPROVE_TRANSFERS` permission before the transfer executes. While a request is pending, the asset is locked — no edits, reassignments, or returns are possible. On approval the system auto-assigns the asset to the target employee. On rejection IT Support is notified with the reason and a one-click resubmit option.

---

## What Already Exists

The following backend infrastructure is already in place and must not be replaced:

- `transfer_requests` DB table with `TransferRequest` entity (`PENDING` / `APPROVED` / `REJECTED` statuses — `CANCELLED` will be added)
- `TransferRequestsService`: `createRequest()`, `getPendingRequests()`, `approveRequest()` (calls `itemsService.assign()` automatically), `rejectRequest()`
- `TransferRequestsController`: `POST /transfer-requests/:itemId`, `GET /transfer-requests/pending`, `PATCH /transfer-requests/:id/approve`, `PATCH /transfer-requests/:id/reject`
- `TransferRequestModal.tsx` — frontend modal for submitting a request (target employee + reason)
- Notification types: `TRANSFER_REQUEST_SUBMITTED`, `TRANSFER_REQUEST_APPROVED`, `TRANSFER_REQUEST_REJECTED`
- Permissions: `REQUEST_TRANSFERS` (submit), `APPROVE_TRANSFERS` (approve/reject)

**What is missing:** asset locking, backend guards, the Transfers page, locked-state UI in the employee view, nav entry, and the resubmit notification action.

---

## Decisions

| Question | Decision |
|---|---|
| Auto-assign on approval or manual? | Auto-assign — `approveRequest()` already calls `itemsService.assign()` |
| Rejection flow | Unlock + notify IT Support with reason + "Resubmit" action |
| Who can approve? | SUPER_ADMIN + any Admin with `APPROVE_TRANSFERS` permission |
| Can IT Support cancel a pending request? | Yes — "Cancel Request" button replaces "Request Transfer" while locked |
| Locking mechanism | `pendingTransferRequestId` nullable FK on `items` table |

---

## Data Layer Changes

### 1. Migration — add FK on `items`

Add a nullable column `pending_transfer_request_id` (UUID, FK → `transfer_requests.id`, SET NULL on delete) to the `items` table.

### 2. Item entity update

```typescript
// inventory-api/src/items/entities/item.entity.ts
@Column({ nullable: true, type: 'uuid' })
pendingTransferRequestId: string | null;

@ManyToOne(() => TransferRequest, { nullable: true, eager: false, onDelete: 'SET NULL' })
@JoinColumn({ name: 'pending_transfer_request_id' })
pendingTransferRequest: TransferRequest | null;
```

### 3. TransferRequest entity — add requester relation

The `requestedByUserId` field already exists. Ensure the `requestedByUser` relation is loaded when fetching pending requests so the Transfers page can display who submitted each request.

---

## Backend Changes

### TransferRequestsService

**`createRequest()`** — after inserting the request row, set `item.pendingTransferRequestId = request.id` and save.

**`approveRequest()`** — existing auto-assign logic stays. After `itemsService.assign()`, clear `item.pendingTransferRequestId = null` and save.

**`rejectRequest()`** — clear `item.pendingTransferRequestId = null`, save. Rejection notification already exists; extend its payload to include a `resubmitData` object (itemId, targetType, newAssignedToName, newAssignedToEmployeeId, reason) so the frontend can pre-fill the modal.

**New: `cancelRequest(itemId, userId)`** — called by IT Support to withdraw a pending request. Guards: request must be PENDING and `requestedByUserId === userId`. Sets request status to `CANCELLED` (keeps row for history). Clears `item.pendingTransferRequestId = null`.

### New endpoint

```
DELETE /transfer-requests/:itemId/cancel
```
Requires `REQUEST_TRANSFERS` permission. Calls `cancelRequest()`.

### Item operation guards — `items.service.ts`

Add a lock check at the top of `assign()`, `update()`, and the return/unassign method:

```typescript
if (item.pendingTransferRequestId) {
  throw new ConflictException('Asset is locked — a transfer request is pending');
}
```

### Items query — include lock state

When fetching items for the employee detail view, include `pendingTransferRequestId` and `pendingTransferRequest` (with `newAssignedToName`, `newAssignedToEmployeeId`, `requestedByUserId`) in the response so the frontend can render the locked state without a second request.

---

## Frontend Changes

### 1. Employees page — asset table row

Each asset row in the employee detail already has action buttons. Changes:

- **If `item.pendingTransferRequestId` is set:**
  - Add amber row highlight (`background: #f0a50008`, `border: 1px solid #f0a50030`)
  - Show `⏳ Transfer Pending → [newAssignedToName]` badge next to the asset name
  - Disable **Edit** and **Return** buttons with `title="Locked — transfer pending"`
  - Replace **Request Transfer** button with red **Cancel Request** button
  - Clicking **Cancel Request** shows a confirm dialog → calls `DELETE /transfer-requests/:itemId/cancel` → invalidates item query

- **If not locked:** behaviour unchanged — **Request Transfer** button as today

### 2. TransferRequestModal — resubmit pre-fill

Accept an optional `prefill` prop (`{ targetType, newAssignedToName, newAssignedToEmployeeId, reason }`). When provided, initialise form fields with these values. The rejection notification's action button passes this prefill data when opening the modal.

### 3. Transfers page — new route `/transfers`

New page `inventory-UI/src/features/transfers/TransfersPage.tsx`.

**Visible to:** users where `isSuperAdmin()` or `hasPermission('APPROVE_TRANSFERS')`.

**Layout:**
- Page title: "Transfer Requests" with subtitle "Review and approve asset transfer requests from IT Support"
- Two tabs: **Pending** (default) | **History**
- Pending tab: table with columns — Asset (name + barcode), Current Holder (avatar + name + ID), Transfer To (avatar + name + ID), Reason, Requested By, Date, Actions
- Each row: **Approve** button (green outline) + **Reject** button (red outline)
- **Approve** — confirm dialog → calls `PATCH /transfer-requests/:id/approve` → row removed → success toast
- **Reject** — modal with a required "Reason" textarea → calls `PATCH /transfer-requests/:id/reject` → row removed → success toast
- **History tab** — calls a new `GET /transfer-requests/history` endpoint, shows same columns plus Status badge (APPROVED / REJECTED) and review notes. Read-only, no actions.
- Nav badge on "Transfers" nav item shows pending count (same style as notification bell badge)

### 4. Router — add `/transfers` route

```tsx
{ path: '/transfers', element: <TransfersPage /> }
```

### 5. AdminLayout nav

Add "Transfers" nav item between "Gate Passes" and "Disposals". Render only when `isSuperAdmin()` or `hasPermission('APPROVE_TRANSFERS')`. Show a count badge from `GET /transfer-requests/pending` (count only).

---

## New Backend Endpoint — History

```
GET /transfer-requests/history
```

Returns all `APPROVED`, `REJECTED`, and `CANCELLED` transfer requests, ordered by `updatedAt DESC`. Requires `APPROVE_TRANSFERS` permission. Pagination optional (page/limit query params).

---

## Notification Behaviour

| Event | Recipient | Type | Extra |
|---|---|---|---|
| Request submitted | All SUPER_ADMINs + APPROVE_TRANSFERS users | `TRANSFER_REQUEST_SUBMITTED` | Links to `/transfers` |
| Request approved | Requester (IT Support) | `TRANSFER_REQUEST_APPROVED` | Links to the item |
| Request rejected | Requester (IT Support) | `TRANSFER_REQUEST_REJECTED` | Includes resubmit payload |
| Request cancelled | No notification needed | — | — |

The **rejection notification** includes a `resubmitData` object in its `metadata`/payload. In the notification panel, `TRANSFER_REQUEST_REJECTED` notifications render an extra **"Resubmit"** action button that opens `TransferRequestModal` pre-filled with the original request data.

---

## Error States

| Scenario | Backend response | Frontend behaviour |
|---|---|---|
| Submit request while item already locked | `409 Conflict` | Toast: "This asset already has a pending transfer request" |
| Submit request for item in repair/disposed/lost | `409 Conflict` (existing guard) | Toast: existing error message |
| Approve/reject/cancel request that is no longer PENDING | `409 Conflict` | Toast: "This request has already been resolved" |
| Cancel request by a different user than submitter | `403 Forbidden` | Toast: "You can only cancel your own requests" |
| Assign/edit/return locked item via API | `409 Conflict` | Toast: "Asset is locked — a transfer request is pending" |

---

## Scope — Explicitly Out

- Email notifications for transfer events (existing email infrastructure can be wired separately)
- Bulk approve/reject
- Transfer requests for DEPARTMENT or COMPANY target types — the modal already supports these but the Transfers page only needs to handle PERSON transfers for now; the others display correctly but are lower-priority
- Timeout / auto-expiry of pending requests

