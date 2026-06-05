# Serial Number Uniqueness + Dropdown Loading Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate serial numbers on asset registration/update, and fix intermittent empty category/department dropdowns (plus pre-fill company for non-super-admin users).

**Architecture:** Backend adds a `checkSerialExists()` method + `GET /items/check-serial` endpoint (placed before the catch-all `GET /:barcodeOrId`) with guards in `create()` and `update()`. Frontend adds a 500ms debounced inline check in ItemModal, pre-fills `companyId` from auth store for non-super-admins, hides the company selector for them, and adds `staleTime` + loading states to category/department dropdowns.

**Tech Stack:** NestJS + TypeORM (PostgreSQL), React + TanStack Query v5, Zustand auth store.

---

## File Map

| File | Change |
|------|--------|
| `inventory-api/src/items/items.service.ts` | Add `checkSerialExists()` method; add serial guard at top of `create()` and `update()` |
| `inventory-api/src/items/items.controller.ts` | Add `GET /check-serial` endpoint (after `preview-barcode`, before `/:barcodeOrId`) |
| `inventory-UI/src/services/item.service.ts` | Add `checkSerial()` method |
| `inventory-UI/src/features/items/ItemModal.tsx` | Debounced inline serial check, company pre-fill, hide selector for non-super-admin, staleTime + loading states |

No new files.

---

## Task 1: `checkSerialExists()` service method + `GET /check-serial` endpoint

**Files:**
- Modify: `inventory-api/src/items/items.service.ts` (after `create()`, before `findAll()` around line 137)
- Modify: `inventory-api/src/items/items.controller.ts` (after `preview-barcode` block, line 68)

- [ ] **Step 1: Add `checkSerialExists()` to items.service.ts**

In [items.service.ts](inventory-api/src/items/items.service.ts), insert this method between the end of `create()` (line 136) and the start of `findAll()` (line 138):

```typescript
async checkSerialExists(
  sn: string,
  excludeId?: string,
): Promise<{ exists: boolean; item?: { id: string; barcode: string; name: string } }> {
  const trimmed = sn?.trim();
  if (!trimmed) return { exists: false };
  const qb = this.itemsRepository
    .createQueryBuilder('item')
    .select(['item.id', 'item.barcode', 'item.name'])
    .where('item.serialNumber = :sn', { sn: trimmed });
  if (excludeId) qb.andWhere('item.id != :excludeId', { excludeId });
  const found = await qb.getOne();
  if (!found) return { exists: false };
  return { exists: true, item: { id: found.id, barcode: found.barcode, name: found.name } };
}
```

- [ ] **Step 2: Add `GET /check-serial` endpoint to items.controller.ts**

In [items.controller.ts](inventory-api/src/items/items.controller.ts), insert after the `previewBarcode` block (line 68) and **before** `findAll` (line 70). This ordering is critical — NestJS must see this static route before the catch-all `GET /:barcodeOrId` (line 126):

```typescript
@Get('check-serial')
@SkipAudit()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
checkSerial(
  @Query('sn') sn: string,
  @Query('excludeId') excludeId?: string,
) {
  return this.itemsService.checkSerialExists(sn, excludeId);
}
```

No `@Permissions()` decorator — any authenticated admin can call this lightweight read-only lookup.

- [ ] **Step 3: Start the API and verify the endpoint responds**

```bash
cd inventory-api && npm run start:dev
```

Then in a second terminal (replace `<token>` with a valid JWT from browser DevTools → Network):

```bash
# Empty sn → exists: false
curl -s -H "Authorization: Bearer <token>" \
  "http://localhost:3000/items/check-serial?sn=" | jq
# Expected: {"exists":false}

# Non-existent serial → exists: false
curl -s -H "Authorization: Bearer <token>" \
  "http://localhost:3000/items/check-serial?sn=SN-DOESNOTEXIST-999" | jq
# Expected: {"exists":false}
```

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/items/items.service.ts inventory-api/src/items/items.controller.ts
git commit -m "feat: add checkSerialExists service method and check-serial endpoint"
```

---

## Task 2: Serial guard in `create()` and `update()`

**Files:**
- Modify: `inventory-api/src/items/items.service.ts`

- [ ] **Step 1: Add guard in `create()`**

In [items.service.ts](inventory-api/src/items/items.service.ts), insert after the company lookup (line 82, `if (!company) throw...`) and **before** the `dataSource.transaction(` call (line 84):

```typescript
if (dto.serialNumber?.trim()) {
  const { exists, item: conflict } = await this.checkSerialExists(dto.serialNumber.trim());
  if (exists) throw new ConflictException(`Serial number already registered on ${conflict!.barcode}`);
}
```

The full `create()` opening now reads:

```typescript
async create(dto: CreateItemDto, userId: string): Promise<Item> {
  const category = await this.categoriesRepository.findOne({ where: { id: dto.categoryId } });
  if (!category) throw new NotFoundException('Category not found');

  const company = await this.companyRepository.findOne({ where: { id: dto.companyId } });
  if (!company) throw new NotFoundException('Company not found');

  if (dto.serialNumber?.trim()) {
    const { exists, item: conflict } = await this.checkSerialExists(dto.serialNumber.trim());
    if (exists) throw new ConflictException(`Serial number already registered on ${conflict!.barcode}`);
  }

  const saved = await this.dataSource.transaction(async (manager) => {
```

- [ ] **Step 2: Add guard in `update()`**

In [items.service.ts](inventory-api/src/items/items.service.ts), add the check **before** the `dataSource.transaction()` call (line 368), mirroring the same pattern used in `create()`:

```typescript
async update(id: string, dto: UpdateItemDto, userId: string): Promise<Item> {
  if (dto.serialNumber !== undefined && dto.serialNumber?.trim()) {
    const { exists, item: conflict } = await this.checkSerialExists(dto.serialNumber.trim(), id);
    if (exists) throw new ConflictException(`Serial number already registered on ${conflict!.barcode}`);
  }

  return this.dataSource.transaction(async (manager) => {
    const item = await manager.findOne(Item, { where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    if (item.pendingTransferRequestId) {
      throw new ConflictException('Asset is locked — a transfer request is pending');
    }

    const prevStatus = item.status;
```

Placing the check before the transaction keeps it consistent with `create()` and avoids mixing `this.itemsRepository` with `manager` inside the transaction callback.

- [ ] **Step 3: Verify the guard works**

Open the Items page in the browser, find an item that has a serial number, note it (e.g. `SN-12003X`). Open another item in Edit mode, set its serial to `SN-12003X`, click Save. Expect a toast error: `Serial number already registered on [BARCODE]`. Save with a unique serial — should succeed.

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/items/items.service.ts
git commit -m "feat: guard create/update against duplicate serial numbers"
```

---

## Task 3: Frontend `checkSerial()` in item.service.ts

**Files:**
- Modify: `inventory-UI/src/services/item.service.ts` (after `previewBarcode`, ~line 97)

- [ ] **Step 1: Add `checkSerial` method**

In [item.service.ts](inventory-UI/src/services/item.service.ts), insert after the `previewBarcode` method (after line 97):

```typescript
checkSerial: async (
  sn: string,
  excludeId?: string,
): Promise<{ exists: boolean; item?: { id: string; barcode: string; name: string } }> => {
  const { data } = await apiClient.get('/items/check-serial', {
    params: { sn, ...(excludeId ? { excludeId } : {}) },
  });
  return data;
},
```

- [ ] **Step 2: Commit**

```bash
git add inventory-UI/src/services/item.service.ts
git commit -m "feat: add checkSerial method to itemService"
```

---

## Task 4: Debounced inline serial check in ItemModal

**Files:**
- Modify: `inventory-UI/src/features/items/ItemModal.tsx`

- [ ] **Step 1: Add imports**

In [ItemModal.tsx](inventory-UI/src/features/items/ItemModal.tsx), add these two imports after the existing import block (after line 10):

```typescript
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types';
```

- [ ] **Step 2: Add `user` hook call before `formData` state**

After line 21 (`const isEdit = !!item;`) and **before** the `useState(formData)` call (line 23), insert:

```typescript
const user = useAuthStore(state => state.user);
```

This must come before `useState` so the initial state computation (Task 5) can reference it.

- [ ] **Step 3: Add serial check state and ref**

After the existing debounce ref on line 73 (`const nameDebounceRef = ...`), add:

```typescript
const serialDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [serialStatus, setSerialStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
const [serialConflict, setSerialConflict] = useState<{ barcode: string; name: string } | null>(null);
```

- [ ] **Step 4: Reset serial state on modal open**

Inside the `useEffect` (line 38–62), after `setCompanyChanged(false);` (line 60), add:

```typescript
setSerialStatus('idle');
setSerialConflict(null);
```

- [ ] **Step 5: Replace serial number input with debounced version**

Find the serial number input (lines 494–500):

```typescript
<input
  id="item-serial"
  style={styles.inputSimple}
  placeholder="e.g. SN-12003X"
  value={formData.serialNumber}
  onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
/>
```

Replace with:

```typescript
<input
  id="item-serial"
  style={{
    ...styles.inputSimple,
    borderColor: serialStatus === 'taken'
      ? '#ef4444'
      : serialStatus === 'available'
      ? '#10b981'
      : undefined,
  }}
  placeholder="e.g. SN-12003X"
  value={formData.serialNumber}
  onChange={e => {
    const val = e.target.value;
    setFormData({ ...formData, serialNumber: val });
    setSerialStatus('idle');
    setSerialConflict(null);
    if (serialDebounceRef.current) clearTimeout(serialDebounceRef.current);
    const trimmed = val.trim();
    if (!trimmed) return;
    setSerialStatus('checking');
    serialDebounceRef.current = setTimeout(async () => {
      try {
        const result = await itemService.checkSerial(
          trimmed,
          isEdit ? item?.id : undefined,
        );
        if (result.exists) {
          setSerialStatus('taken');
          setSerialConflict(result.item ?? null);
        } else {
          setSerialStatus('available');
        }
      } catch {
        setSerialStatus('idle');
      }
    }, 500);
  }}
/>
```

- [ ] **Step 6: Add inline status message below serial input**

Immediately after the `<input />` just replaced (still inside the `<div style={{ flex: '1 1 150px' }}>` container), add:

```typescript
{formData.serialNumber.trim() !== '' && serialStatus !== 'idle' && (
  <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700 }}>
    {serialStatus === 'checking' && (
      <span style={{ color: 'var(--text-muted)' }}>Checking...</span>
    )}
    {serialStatus === 'available' && (
      <span style={{ color: '#10b981' }}>✓ Available</span>
    )}
    {serialStatus === 'taken' && (
      <span style={{ color: '#ef4444' }}>
        ✗ Already registered on {serialConflict?.barcode}
      </span>
    )}
  </div>
)}
```

- [ ] **Step 7: Disable submit while check is in-flight**

Find the submit button `disabled` prop (line 688):

```typescript
disabled={mutation.isPending || uploadMutation.isPending}
```

Replace with:

```typescript
disabled={mutation.isPending || uploadMutation.isPending || serialStatus === 'checking'}
```

- [ ] **Step 8: Verify in browser**

Open Register New Asset. Type a serial number — after 500ms the field border turns green and shows "✓ Available". Find an item with a known serial from the Items list. Type that serial into the new item form — border turns red and shows "✗ Already registered on [BARCODE]". The Confirm Intake button is disabled while the check is running (brief spinner text shows).

In Edit mode: open an existing item. Change its serial to one used by another item — same red error. Change it back to the original value (or to a unique value) — check should show available (original excluded via `excludeId`).

- [ ] **Step 9: Commit**

```bash
git add inventory-UI/src/features/items/ItemModal.tsx
git commit -m "feat: debounced inline serial number uniqueness check in ItemModal"
```

---

## Task 5: Company pre-fill + staleTime + loading states in ItemModal

**Files:**
- Modify: `inventory-UI/src/features/items/ItemModal.tsx`

`user` and its imports are already added in Task 4. This task builds on that.

- [ ] **Step 1: Pre-fill `companyId` in initial `useState`**

In [ItemModal.tsx](inventory-UI/src/features/items/ItemModal.tsx), find the `useState(formData)` initializer (line 23–36). Change `companyId` (line 26):

Old:
```typescript
companyId: item?.companyId || '',
```

New:
```typescript
companyId: item?.companyId || (!item && user?.role !== UserRole.SUPER_ADMIN ? (user?.companyId ?? '') : ''),
```

- [ ] **Step 2: Pre-fill `companyId` in the `useEffect` reset**

Inside `useEffect` (line 38–62), change `companyId` (line 43):

Old:
```typescript
companyId: item?.companyId || '',
```

New:
```typescript
companyId: item?.companyId || (!isEdit && user?.role !== UserRole.SUPER_ADMIN ? (user?.companyId ?? '') : ''),
```

- [ ] **Step 3: Add `showCompanySelector` flag**

After the `useMemo` for `departmentsList` (line 114) and before the `useEffect` for outside-click (line 132), add:

```typescript
// Non-super-admins creating an asset always use their own company — hide the selector.
// Show it when: super-admin, edit mode (may need to see current company), or no companyId on user.
const showCompanySelector =
  user?.role === UserRole.SUPER_ADMIN || isEdit || !user?.companyId;
```

- [ ] **Step 4: Conditionally render company selector**

Find the company subsidiary `<div>` block (lines 444–470):

```typescript
<div>
  <label htmlFor="item-company" style={styles.label}>COMPANY SUBSIDIARY ...
  ...
  {companyChanged && (...)}
</div>
```

Wrap the entire `<div>` with `{showCompanySelector && (`:

```typescript
{showCompanySelector && (
  <div>
    <label htmlFor="item-company" style={styles.label}>COMPANY SUBSIDIARY <span style={{ color: 'var(--accent-red)' }}>*</span></label>
    <div style={styles.inputWrap}>
      <Globe style={styles.inputIcon} size={16} />
      <select
        id="item-company"
        style={styles.input}
        value={formData.companyId}
        onChange={e => {
          const newCompanyId = e.target.value;
          if (isEdit && newCompanyId !== item?.companyId) setCompanyChanged(true);
          else if (isEdit && newCompanyId === item?.companyId) setCompanyChanged(false);
          setFormData({ ...formData, companyId: newCompanyId, departmentId: '' });
        }}
      >
        <option value="">Select Subsidiary</option>
        {companiesList.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
    {companyChanged && (
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#e67e22', fontWeight: 600 }}>
        ⚠ Changing company will generate a new Asset QR ID. Reprint the QR label after saving.
      </p>
    )}
  </div>
)}
```

- [ ] **Step 5: Add `staleTime` and `isLoading` to categories query**

Find the categories `useQuery` (line 84):

Old:
```typescript
const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.getCategories({ limit: 500 }) });
```

New:
```typescript
const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => categoryService.getCategories({ limit: 500 }),
  staleTime: 5 * 60 * 1000,
});
```

- [ ] **Step 6: Add `staleTime` and `isLoading` to departments query**

Find the departments `useQuery` (lines 86–90):

Old:
```typescript
const { data: departments = [] } = useQuery({
  queryKey: ['departments', formData.companyId],
  queryFn: () => departmentService.getDepartments(formData.companyId, { limit: 500 }),
  enabled: !!formData.companyId
});
```

New:
```typescript
const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
  queryKey: ['departments', formData.companyId],
  queryFn: () => departmentService.getDepartments(formData.companyId, { limit: 500 }),
  enabled: !!formData.companyId,
  staleTime: 2 * 60 * 1000,
});
```

- [ ] **Step 7: Add loading state to category select**

Find the category `<select>` (lines 402–415). Change the first `<option>` only:

Old:
```typescript
<option value="">Select Category</option>
```

New:
```typescript
<option value="">{isLoadingCategories ? 'Loading categories...' : 'Select Category'}</option>
```

- [ ] **Step 8: Add loading state to department select**

Find the department `<select>` (lines 480–488). Change `disabled` and first `<option>`:

Old:
```typescript
<select
  id="item-department"
  style={styles.input}
  value={formData.departmentId}
  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
  disabled={!formData.companyId}
>
  <option value="">Select Department</option>
```

New:
```typescript
<select
  id="item-department"
  style={styles.input}
  value={formData.departmentId}
  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
  disabled={!formData.companyId || isLoadingDepartments}
>
  <option value="">{isLoadingDepartments ? 'Loading departments...' : 'Select Department'}</option>
```

- [ ] **Step 9: Verify in browser**

**As super-admin:** Open Register New Asset — company selector is visible. Select a company — departments load with "Loading departments..." briefly, then list appears. Closing and reopening the modal within 2 minutes should serve departments from cache instantly.

**As a non-super-admin (IT Support):** Open Register New Asset — company selector is not visible, departments list populates immediately (pre-filled from user profile). The barcode preview also updates immediately since `companyId` is already set.

- [ ] **Step 10: Commit**

```bash
git add inventory-UI/src/features/items/ItemModal.tsx
git commit -m "feat: pre-fill company for non-super-admin, staleTime and loading states for dropdowns"
```

---

## Task 6: DB partial unique index (production migration)

Run this on the production PostgreSQL database. The API from Tasks 1–2 must be deployed first (so the service-level check fires before the DB constraint, giving a friendly error message rather than a raw DB error).

- [ ] **Step 1: SSH to server and connect to the DB**

```bash
ssh ubuntu@apps.myblockchainbpo.com
cd ~/KTMG-VAULT
sudo docker compose exec db psql -U postgres -d inventory
```

- [ ] **Step 2: Run the migration**

```sql
CREATE UNIQUE INDEX CONCURRENTLY items_serial_number_unique
  ON items ("serialNumber")
  WHERE "serialNumber" IS NOT NULL;
```

`CONCURRENTLY` builds the index without locking the table — safe to run while the API is live.

- [ ] **Step 3: Verify**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'items' AND indexname = 'items_serial_number_unique';
```

Expected output:
```
          indexname            |                                          indexdef
-------------------------------+-----------------------------------------------------------------------------------------------
 items_serial_number_unique    | CREATE UNIQUE INDEX items_serial_number_unique ON public.items ("serialNumber") WHERE ("serialNumber" IS NOT NULL)
(1 row)
```

Exit psql with `\q`.

---

## Deploy

After all tasks are committed and both API and UI changes are pushed:

```bash
cd ~/KTMG-VAULT && git pull && sudo docker compose build --no-cache api ui && sudo docker compose up -d api ui
```

Then run the Task 6 DB migration.
