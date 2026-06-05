# Spec: Serial Number Uniqueness + Dropdown Loading Fix

**Date:** 2026-06-05  
**Scope:** Asset registration/update form — duplicate serial number prevention and reliable dropdown data loading for all user roles.

---

## 1. Serial Number Uniqueness

### Problem
The `serialNumber` field on items has no uniqueness constraint anywhere (DB or service). Two assets with the same serial number can be registered without any warning.

### Backend

**New endpoint:** `GET /items/check-serial`
- Query params: `sn: string` (required), `excludeId?: string` (UUID, used in edit mode to skip the current item)
- Auth: requires valid JWT only (no specific permission check — it is a lightweight read-only lookup; the modal itself is already gated by `CREATE_ITEMS` / `UPDATE_ITEMS`)
- Returns: `{ exists: boolean, item?: { id, barcode, name } }`
- If `sn` is empty/whitespace, return `{ exists: false }`

**Guard in `create()` and `update()`:**
- If `dto.serialNumber` is non-empty after trim, query for existing item with the same `serialNumber` (excluding current item ID in update mode)
- Throw `ConflictException('Serial number already registered on [barcode]')` if found
- This is a belt-and-suspenders guard for direct API calls; the UI also checks inline

**DB partial unique index (production migration required):**
```sql
CREATE UNIQUE INDEX CONCURRENTLY items_serial_number_unique
  ON items ("serialNumber")
  WHERE "serialNumber" IS NOT NULL;
```
- Allows unlimited NULL values (items without serials)
- Enforces uniqueness only on non-null values
- Handles concurrent creates that bypass the service-level check

### Frontend (ItemModal)

**Inline serial check:**
- 500ms debounce after user stops typing in the serial number field
- Fires `GET /items/check-serial?sn=<value>&excludeId=<itemId>` (excludeId only in edit mode)
- Field states:
  - Typing / checking: spinner icon inside input
  - Available: green text `✓ Available` below field
  - Taken: red text `✗ Already registered on [BARCODE]` below field (barcode is the conflicting asset's barcode)
  - Empty field: no indicator shown
- Submit button (`Confirm Intake` / `Save Changes`) is disabled while a serial check is in-flight
- On submit, a 409 response from the backend shows a toast as fallback (existing error toast pattern)

---

## 2. Dropdown Loading Fix

### Problem
Two separate root causes:

**A — Regular admins: departments never load on modal open**  
`formData.companyId` initializes as `''` for all new items. The departments query has `enabled: !!formData.companyId`, so it never fires until the user manually selects a company. Regular admins belong to exactly one company (`user.companyId` in auth store) and expect departments to be pre-populated.

**B — All users: empty dropdowns with no feedback during slow fetches**  
No `staleTime` is configured on category or department queries. Every modal open triggers a fresh API fetch. When the server is slow (cold start, high load), users see empty selects with no loading indicator and assume the data is missing.

### Frontend Changes Only (no backend changes needed)

**Company pre-fill for non-super-admins (fixes root cause A):**
- In `ItemModal`, read `user` from `useAuthStore()`
- In create mode, initialize `formData.companyId` to `user.companyId` when `user.role !== UserRole.SUPER_ADMIN` and `user.companyId` is non-null
- For non-super-admin users whose `companyId` is set: hide the company selector (the value is still included in the form submit payload — it is just not editable); their assets always belong to their own company
- If a non-super-admin has no `companyId` (edge case), fall back to showing the company selector so they can pick one manually
- For super-admin users, company selector remains visible and starts empty (as today)
- In edit mode, `companyId` is always pre-filled from the existing item (no change)

**staleTime (fixes root cause B):**
- Categories query: `staleTime: 5 * 60 * 1000` (5 minutes — categories almost never change)
- Departments query: `staleTime: 2 * 60 * 1000` (2 minutes per company)
- Data cached in React Query will be served immediately on subsequent modal opens; background refresh happens silently

**Loading states:**
- While categories are loading (`isLoadingCategories`): show a single disabled option `"Loading categories..."` in the category select
- While departments are loading (`isLoadingDepartments`): show a single disabled option `"Loading departments..."` in the department select
- Once loaded, render the normal option list

---

## 3. Out of Scope

- Backend company scoping on the departments/categories endpoints (they already work correctly — the frontend fix makes the right query)
- Changing which roles can see the Items page or register assets
- Serial number format validation (no format is enforced — any string is valid)
- Real-time collision notification via WebSocket

---

## 4. Production Migration

One SQL statement to run after deploying the API:

```sql
CREATE UNIQUE INDEX CONCURRENTLY items_serial_number_unique
  ON items ("serialNumber")
  WHERE "serialNumber" IS NOT NULL;
```

`CONCURRENTLY` means the index builds without locking the table — safe to run on a live database.

---

## 5. Files Affected

| File | Change |
|------|--------|
| `inventory-api/src/items/items.controller.ts` | Add `GET /items/check-serial` endpoint |
| `inventory-api/src/items/items.service.ts` | Add `checkSerialExists()` method; add serial guard in `create()` and `update()` |
| `inventory-UI/src/services/item.service.ts` | Add `checkSerial(sn, excludeId?)` API call |
| `inventory-UI/src/features/items/ItemModal.tsx` | Debounced inline check, company pre-fill for non-super-admin, staleTime, loading states |
