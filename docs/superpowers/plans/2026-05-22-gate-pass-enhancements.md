# Gate Pass Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `CREATE_GATE_PASS` / `APPROVE_GATE_PASS` two-permission approval workflow, fix the random print reference number bug, remove gate pass UI from ItemsPage, and replace it with a dedicated `/gate-passes` page and drawer.

**Architecture:** Extend the existing `GatePass` entity with `PENDING_APPROVAL` status and four new columns (`companyId`, `approvedByUserId`, `approvedAt`, `rejectionNotes`). Items stay `WAREHOUSE` on creation and only move to `IN_TRANSIT` on approval. A new dedicated Gate Passes page serves both roles: approvers see all passes with status filter; requesters see only their own submissions.

**Tech Stack:** NestJS 10 + TypeORM 0.3 + PostgreSQL (backend, `synchronize: true` in dev). React 19 + TypeScript + TanStack Query v5 + TanStack Table v8 + Lucide React + react-hot-toast + inline styles with CSS variables (frontend).

---

## File Map

| File | Action |
|---|---|
| `inventory-api/src/common/enums/index.ts` | Modify — add 2 permissions + 1 status |
| `inventory-api/src/items/entities/gate-pass.entity.ts` | Modify — add 4 columns + 1 relation |
| `inventory-api/src/items/dto/gate-pass.dto.ts` | Modify — add `RejectGatePassDto`, `GatePassQueryDto` |
| `inventory-api/src/items/gate-passes.service.ts` | Rewrite — new approval methods + scoping |
| `inventory-api/src/items/gate-passes.controller.ts` | Rewrite — add guards + 5 new routes |
| `inventory-api/src/items/gate-passes.service.spec.ts` | Create — unit tests for service logic |
| `inventory-UI/src/types/index.ts` | Modify — add 2 permissions + 1 status |
| `inventory-UI/src/services/gatePass.service.ts` | Rewrite — updated interface + 5 new methods |
| `inventory-UI/src/utils/formPrinter.ts` | Modify — fix random reference number |
| `inventory-UI/src/features/gate-passes/CreateGatePassModal.tsx` | Create — item picker + create form |
| `inventory-UI/src/features/gate-passes/GatePassesPage.tsx` | Create — role-aware table page |
| `inventory-UI/src/features/gate-passes/GatePassDetailDrawer.tsx` | Create — detail + action drawer |
| `inventory-UI/src/components/layout/Sidebar.tsx` | Modify — add GATE PASSES nav entry |
| `inventory-UI/src/features/users/PermissionsModal.tsx` | Modify — add Gate Pass Workflow group |
| `inventory-UI/src/features/items/ItemsPage.tsx` | Modify — remove all gate pass UI |
| `inventory-UI/src/router/index.tsx` | Modify — add `/gate-passes` route |

---

## Task 1: Backend Enums + Entity

**Files:**
- Modify: `inventory-api/src/common/enums/index.ts`
- Modify: `inventory-api/src/items/entities/gate-pass.entity.ts`

- [ ] **Step 1: Add new permissions and status to backend enums**

In `inventory-api/src/common/enums/index.ts`, after `APPROVE_DISPOSAL_L2 = 'APPROVE_DISPOSAL_L2',` add:

```typescript
  // Gate Pass workflow
  CREATE_GATE_PASS = 'CREATE_GATE_PASS',
  APPROVE_GATE_PASS = 'APPROVE_GATE_PASS',
```

In the same file, replace the `GatePassStatus` enum:

```typescript
export enum GatePassStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}
```

- [ ] **Step 2: Extend the GatePass entity with new columns**

Replace the full contents of `inventory-api/src/items/entities/gate-pass.entity.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from './item.entity';
import { GatePassStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('gate_passes')
export class GatePass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  referenceNo: string;

  @Column()
  companyId: string;

  @Column()
  destination: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  authorizedBy: string;

  @Column({
    type: 'enum',
    enum: GatePassStatus,
    default: GatePassStatus.PENDING_APPROVAL,
  })
  status: GatePassStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedByUserId' })
  approvedByUser: User | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionNotes: string | null;

  @OneToMany(() => Item, (item) => item.gatePass)
  items: Item[];

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 3: Verify the app starts (schema sync)**

```bash
cd inventory-api && npm run start:dev
```

Expected: server starts, TypeORM logs `ALTER TABLE gate_passes ADD COLUMN company_id`, `ADD COLUMN approved_by_user_id`, `ADD COLUMN approved_at`, `ADD COLUMN rejection_notes`. If you see an error about altering the `gate_pass_status_enum` type, run this SQL manually in your DB then restart:

```sql
ALTER TYPE gate_pass_status_enum ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
```

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/common/enums/index.ts inventory-api/src/items/entities/gate-pass.entity.ts
git commit -m "feat(gate-pass): add PENDING_APPROVAL status and approval columns to entity"
```

---

## Task 2: Backend DTOs + Service

**Files:**
- Modify: `inventory-api/src/items/dto/gate-pass.dto.ts`
- Modify: `inventory-api/src/items/gate-passes.service.ts`

- [ ] **Step 1: Add new DTOs**

Replace the full contents of `inventory-api/src/items/dto/gate-pass.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';
import { GatePassStatus } from '../../common/enums';

export class CreateGatePassDto {
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  authorizedBy?: string;
}

export class AppendToGatePassDto {
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];
}

export class ReturnGatePassDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectGatePassDto {
  @IsString()
  @IsNotEmpty()
  rejectionNotes: string;
}

export class GatePassQueryDto {
  @IsEnum(GatePassStatus)
  @IsOptional()
  status?: GatePassStatus;
}
```

- [ ] **Step 2: Rewrite the service**

Replace the full contents of `inventory-api/src/items/gate-passes.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { GatePass } from './entities/gate-pass.entity';
import { Item } from './entities/item.entity';
import { ItemEvent } from './entities/item-event.entity';
import { GatePassStatus, ItemStatus, ItemEventType } from '../common/enums';
import {
  CreateGatePassDto,
  AppendToGatePassDto,
  ReturnGatePassDto,
  RejectGatePassDto,
} from './dto/gate-pass.dto';

@Injectable()
export class GatePassesService {
  constructor(
    @InjectRepository(GatePass)
    private readonly gatePassRepo: Repository<GatePass>,
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,
    @InjectRepository(ItemEvent)
    private readonly eventsRepo: Repository<ItemEvent>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateGatePassDto, userId: string): Promise<GatePass> {
    if (!dto.itemIds || dto.itemIds.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const items = await this.itemsRepo.find({ where: { id: In(dto.itemIds) } });
    if (items.length !== dto.itemIds.length) {
      throw new NotFoundException('Some items were not found');
    }

    for (const item of items) {
      if (item.status !== ItemStatus.WAREHOUSE) {
        throw new BadRequestException(
          `Item "${item.name}" is not in WAREHOUSE status. Only WAREHOUSE items can be issued a Gate Pass.`,
        );
      }
    }

    const companyId = items[0].companyId;

    return this.dataSource.transaction(async (manager) => {
      const maxRef = await manager
        .createQueryBuilder(GatePass, 'gp')
        .select("MAX(CAST(SUBSTRING(gp.referenceNo FROM 4) AS INTEGER))", 'max')
        .getRawOne();
      const nextId = (parseInt(maxRef?.max || '1000')) + 1;
      const referenceNo = `GP-${nextId}`;

      const gatePass = manager.create(GatePass, {
        referenceNo,
        destination: dto.destination,
        reason: dto.reason,
        authorizedBy: dto.authorizedBy,
        createdByUserId: userId,
        companyId,
        status: GatePassStatus.PENDING_APPROVAL,
        approvedByUserId: null,
        approvedAt: null,
        rejectionNotes: null,
      });
      const saved = await manager.save(GatePass, gatePass);

      return (await manager.findOne(GatePass, {
        where: { id: saved.id },
        relations: ['items', 'createdByUser'],
      }))!;
    });
  }

  async approve(
    id: string,
    approverId: string,
    callerCompanyId?: string,
  ): Promise<GatePass> {
    return this.dataSource.transaction(async (manager) => {
      const gatePass = await manager.findOne(GatePass, {
        where: { id },
        relations: ['items'],
      });
      if (!gatePass) throw new NotFoundException('Gate Pass not found');
      if (callerCompanyId && gatePass.companyId !== callerCompanyId) {
        throw new ForbiddenException('Access denied.');
      }
      if (gatePass.status !== GatePassStatus.PENDING_APPROVAL) {
        throw new BadRequestException('This gate pass is not awaiting approval.');
      }
      if (gatePass.createdByUserId === approverId) {
        throw new ForbiddenException('You cannot approve your own gate pass request.');
      }

      gatePass.status = GatePassStatus.ACTIVE;
      gatePass.approvedByUserId = approverId;
      gatePass.approvedAt = new Date();
      gatePass.rejectionNotes = null;
      await manager.save(GatePass, gatePass);

      const events: ItemEvent[] = [];
      for (const item of gatePass.items) {
        const fromStatus = item.status;
        item.status = ItemStatus.IN_TRANSIT;
        item.gatePassId = gatePass.id;
        await manager.save(Item, item);

        events.push(
          manager.create(ItemEvent, {
            itemId: item.id,
            eventType: ItemEventType.GATE_PASS_ISSUED,
            fromStatus,
            toStatus: ItemStatus.IN_TRANSIT,
            notes: `Sent to ${gatePass.destination} via Gate Pass ${gatePass.referenceNo}. Reason: ${gatePass.reason || 'N/A'}. Authorized by: ${gatePass.authorizedBy || 'N/A'}.`,
            performedByUserId: approverId,
          }),
        );
      }
      await manager.save(ItemEvent, events);

      return (await manager.findOne(GatePass, {
        where: { id: gatePass.id },
        relations: ['items', 'createdByUser', 'approvedByUser'],
      }))!;
    });
  }

  async reject(
    id: string,
    dto: RejectGatePassDto,
    rejectorId: string,
    callerCompanyId?: string,
  ): Promise<GatePass> {
    const gatePass = await this.gatePassRepo.findOne({ where: { id } });
    if (!gatePass) throw new NotFoundException('Gate Pass not found');
    if (callerCompanyId && gatePass.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }
    if (gatePass.status !== GatePassStatus.PENDING_APPROVAL) {
      throw new BadRequestException('This gate pass is not awaiting approval.');
    }
    if (gatePass.createdByUserId === rejectorId) {
      throw new ForbiddenException('You cannot reject your own gate pass request.');
    }

    gatePass.rejectionNotes = dto.rejectionNotes;
    return this.gatePassRepo.save(gatePass);
  }

  async cancel(
    id: string,
    userId: string,
    callerCompanyId?: string,
  ): Promise<GatePass> {
    const gatePass = await this.gatePassRepo.findOne({ where: { id } });
    if (!gatePass) throw new NotFoundException('Gate Pass not found');
    if (callerCompanyId && gatePass.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }
    if (gatePass.status !== GatePassStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only pending gate passes can be cancelled.');
    }
    if (gatePass.createdByUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own gate pass requests.');
    }

    gatePass.status = GatePassStatus.CANCELLED;
    return this.gatePassRepo.save(gatePass);
  }

  async append(
    id: string,
    dto: AppendToGatePassDto,
    userId: string,
    callerCompanyId?: string,
  ): Promise<GatePass> {
    const gatePass = await this.gatePassRepo.findOne({ where: { id } });
    if (!gatePass) throw new NotFoundException('Gate Pass not found');
    if (callerCompanyId && gatePass.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }
    if (gatePass.status !== GatePassStatus.ACTIVE) {
      throw new BadRequestException('Can only append to ACTIVE gate passes.');
    }
    if (!dto.itemIds || dto.itemIds.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const items = await this.itemsRepo.find({ where: { id: In(dto.itemIds) } });
    if (items.length !== dto.itemIds.length) {
      throw new NotFoundException('Some items were not found');
    }

    return this.dataSource.transaction(async (manager) => {
      const events: ItemEvent[] = [];
      for (const item of items) {
        if (item.status !== ItemStatus.WAREHOUSE) {
          throw new BadRequestException(
            `Item "${item.name}" is not in WAREHOUSE status`,
          );
        }
        const fromStatus = item.status;
        item.status = ItemStatus.IN_TRANSIT;
        item.gatePassId = gatePass.id;
        await manager.save(Item, item);

        events.push(
          manager.create(ItemEvent, {
            itemId: item.id,
            eventType: ItemEventType.ADDED_TO_GATE_PASS,
            fromStatus,
            toStatus: ItemStatus.IN_TRANSIT,
            notes: `Appended to active Gate Pass ${gatePass.referenceNo}. Destination: ${gatePass.destination}.`,
            performedByUserId: userId,
          }),
        );
      }
      await manager.save(ItemEvent, events);

      return (await manager.findOne(GatePass, {
        where: { id: gatePass.id },
        relations: ['items', 'createdByUser', 'approvedByUser'],
      }))!;
    });
  }

  async markReturned(
    id: string,
    dto: ReturnGatePassDto,
    userId: string,
    callerCompanyId?: string,
  ): Promise<GatePass> {
    const gatePass = await this.gatePassRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!gatePass) throw new NotFoundException('Gate Pass not found');
    if (callerCompanyId && gatePass.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }
    if (gatePass.status !== GatePassStatus.ACTIVE) {
      throw new BadRequestException('Gate Pass is not active');
    }

    return this.dataSource.transaction(async (manager) => {
      gatePass.status = GatePassStatus.RETURNED;
      await manager.save(GatePass, gatePass);

      const events: ItemEvent[] = [];
      for (const item of gatePass.items) {
        item.status = ItemStatus.WAREHOUSE;
        item.gatePassId = null;
        await manager.save(Item, item);

        events.push(
          manager.create(ItemEvent, {
            itemId: item.id,
            eventType: ItemEventType.GATE_PASS_RETURNED,
            fromStatus: ItemStatus.IN_TRANSIT,
            toStatus: ItemStatus.WAREHOUSE,
            notes: `Returned from Gate Pass ${gatePass.referenceNo}. Notes: ${dto.notes || 'N/A'}.`,
            performedByUserId: userId,
          }),
        );
      }
      await manager.save(ItemEvent, events);
      return gatePass;
    });
  }

  async findAll(filters: {
    status?: GatePassStatus;
    companyId?: string;
  }): Promise<GatePass[]> {
    const query = this.gatePassRepo
      .createQueryBuilder('gp')
      .leftJoinAndSelect('gp.items', 'items')
      .leftJoinAndSelect('gp.createdByUser', 'createdByUser')
      .leftJoinAndSelect('gp.approvedByUser', 'approvedByUser')
      .orderBy('gp.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('gp.status = :status', { status: filters.status });
    }
    if (filters.companyId) {
      query.andWhere('gp.companyId = :companyId', {
        companyId: filters.companyId,
      });
    }
    return query.getMany();
  }

  async findOne(id: string, callerCompanyId?: string): Promise<GatePass> {
    const gatePass = await this.gatePassRepo.findOne({
      where: { id },
      relations: ['items', 'createdByUser', 'approvedByUser'],
    });
    if (!gatePass) throw new NotFoundException('Gate Pass not found');
    if (callerCompanyId && gatePass.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }
    return gatePass;
  }

  async findMyRequests(
    userId: string,
    callerCompanyId?: string,
  ): Promise<GatePass[]> {
    const query = this.gatePassRepo
      .createQueryBuilder('gp')
      .leftJoinAndSelect('gp.items', 'items')
      .leftJoinAndSelect('gp.createdByUser', 'createdByUser')
      .leftJoinAndSelect('gp.approvedByUser', 'approvedByUser')
      .where('gp.createdByUserId = :userId', { userId })
      .orderBy('gp.createdAt', 'DESC');

    if (callerCompanyId) {
      query.andWhere('gp.companyId = :companyId', {
        companyId: callerCompanyId,
      });
    }
    return query.getMany();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add inventory-api/src/items/dto/gate-pass.dto.ts inventory-api/src/items/gate-passes.service.ts
git commit -m "feat(gate-pass): add approval workflow to service — PENDING_APPROVAL, approve, reject, cancel"
```

---

## Task 3: Backend Controller + Tests

**Files:**
- Modify: `inventory-api/src/items/gate-passes.controller.ts`
- Create: `inventory-api/src/items/gate-passes.service.spec.ts`

- [ ] **Step 1: Write failing tests first**

Create `inventory-api/src/items/gate-passes.service.spec.ts`:

```typescript
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GatePassesService } from './gate-passes.service';
import { GatePassStatus, ItemStatus } from '../common/enums';

const mockItem = {
  id: 'item-1',
  name: 'Test Laptop',
  barcode: 'BC-001',
  companyId: 'company-1',
  status: ItemStatus.WAREHOUSE,
  gatePassId: null,
};

const mockPass = {
  id: 'pass-1',
  referenceNo: 'GP-1001',
  companyId: 'company-1',
  destination: 'Branch Office',
  reason: 'Reallocation',
  authorizedBy: null,
  status: GatePassStatus.PENDING_APPROVAL,
  createdByUserId: 'user-requester',
  approvedByUserId: null,
  approvedAt: null,
  rejectionNotes: null,
  items: [{ ...mockItem }],
};

describe('GatePassesService', () => {
  let service: GatePassesService;
  let gatePassRepo: any;
  let itemsRepo: any;
  let dataSource: any;

  beforeEach(() => {
    gatePassRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn(),
    };
    itemsRepo = {
      find: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    const mockManager = {
      findOne: jest.fn(),
      save: jest.fn((_, e) => Promise.resolve(e ?? _)),
      create: jest.fn((_, data) => ({ ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: '1000' }),
      }),
    };
    dataSource = { transaction: jest.fn((cb) => cb(mockManager)) };
    service = new GatePassesService(
      gatePassRepo,
      itemsRepo,
      {} as any,
      dataSource,
    );
  });

  describe('approve', () => {
    it('throws NotFoundException if gate pass not found', async () => {
      gatePassRepo.findOne.mockResolvedValue(null);
      // Patch dataSource to use gatePassRepo.findOne
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('bad-id', 'approver-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if status is not PENDING_APPROVAL', async () => {
      const activePass = { ...mockPass, status: GatePassStatus.ACTIVE, items: [] };
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue(activePass), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('pass-1', 'approver-1')).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if approver is the creator', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue({ ...mockPass, items: [] }), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('pass-1', 'user-requester')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if callerCompanyId does not match', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mgr = { findOne: jest.fn().mockResolvedValue({ ...mockPass, items: [] }), save: jest.fn(), create: jest.fn() };
        return cb(mgr);
      });
      await expect(service.approve('pass-1', 'approver-1', 'other-company')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    it('throws NotFoundException if gate pass not found', async () => {
      gatePassRepo.findOne.mockResolvedValue(null);
      await expect(service.reject('bad-id', { rejectionNotes: 'Wrong destination' }, 'approver-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if rejector is the creator', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass });
      await expect(service.reject('pass-1', { rejectionNotes: 'Nope' }, 'user-requester')).rejects.toThrow(ForbiddenException);
    });

    it('sets rejectionNotes and keeps PENDING_APPROVAL status', async () => {
      const pass = { ...mockPass };
      gatePassRepo.findOne.mockResolvedValue(pass);
      gatePassRepo.save.mockImplementation((e: any) => Promise.resolve(e));
      await service.reject('pass-1', { rejectionNotes: 'Wrong items listed' }, 'approver-1');
      expect(pass.rejectionNotes).toBe('Wrong items listed');
      expect(pass.status).toBe(GatePassStatus.PENDING_APPROVAL);
    });
  });

  describe('cancel', () => {
    it('throws ForbiddenException if caller is not the creator', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass });
      await expect(service.cancel('pass-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if status is not PENDING_APPROVAL', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass, status: GatePassStatus.ACTIVE });
      await expect(service.cancel('pass-1', 'user-requester')).rejects.toThrow(BadRequestException);
    });

    it('sets status to CANCELLED', async () => {
      const pass = { ...mockPass };
      gatePassRepo.findOne.mockResolvedValue(pass);
      gatePassRepo.save.mockImplementation((e: any) => Promise.resolve(e));
      await service.cancel('pass-1', 'user-requester');
      expect(pass.status).toBe(GatePassStatus.CANCELLED);
    });
  });

  describe('append', () => {
    it('throws BadRequestException if gate pass is not ACTIVE', async () => {
      gatePassRepo.findOne.mockResolvedValue({ ...mockPass, status: GatePassStatus.PENDING_APPROVAL });
      await expect(service.append('pass-1', { itemIds: ['item-1'] }, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd inventory-api && npx jest gate-passes.service.spec --no-coverage
```

Expected: several tests fail with `TypeError` since the old service doesn't have `approve`, `reject`, `cancel`.

- [ ] **Step 3: Run tests again after Task 2 service rewrite**

```bash
cd inventory-api && npx jest gate-passes.service.spec --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Rewrite the controller**

Replace the full contents of `inventory-api/src/items/gate-passes.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GatePassesService } from './gate-passes.service';
import {
  CreateGatePassDto,
  AppendToGatePassDto,
  ReturnGatePassDto,
  RejectGatePassDto,
  GatePassQueryDto,
} from './dto/gate-pass.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminPermission, UserRole } from '../common/enums';
import { JwtPayload } from '../common/interfaces';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('gate-passes')
export class GatePassesController {
  constructor(private readonly service: GatePassesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  create(@Body() dto: CreateGatePassDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  findAll(@Query() query: GatePassQueryDto, @CurrentUser() user: JwtPayload) {
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId;
    return this.service.findAll({ status: query.status, companyId });
  }

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  findPending(@CurrentUser() user: JwtPayload) {
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId;
    return this.service.findAll({ status: undefined, companyId });
  }

  @Get('my-requests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  findMyRequests(@CurrentUser() user: JwtPayload) {
    return this.service.findMyRequests(
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Get('active')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  findActive(@CurrentUser() user: JwtPayload) {
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId;
    return this.service.findAll({
      status: undefined,
      companyId,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS, AdminPermission.CREATE_GATE_PASS)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(
      id,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.approve(
      id,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectGatePassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reject(
      id,
      dto,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.cancel(
      id,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/append')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  append(
    @Param('id') id: string,
    @Body() dto: AppendToGatePassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.append(
      id,
      dto,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/return')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  markReturned(
    @Param('id') id: string,
    @Body() dto: ReturnGatePassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.markReturned(
      id,
      dto,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }
}
```

- [ ] **Step 5: Verify backend builds**

```bash
cd inventory-api && npm run build
```

Expected: `Successfully compiled` with no errors.

- [ ] **Step 6: Commit**

```bash
git add inventory-api/src/items/gate-passes.controller.ts inventory-api/src/items/gate-passes.service.spec.ts
git commit -m "feat(gate-pass): add permission guards, approval/reject/cancel endpoints, and service tests"
```

---

## Task 4: Frontend Types + Service

**Files:**
- Modify: `inventory-UI/src/types/index.ts`
- Modify: `inventory-UI/src/services/gatePass.service.ts`

- [ ] **Step 1: Add new permissions and status to frontend types**

In `inventory-UI/src/types/index.ts`, after `APPROVE_DISPOSAL_L2 = 'APPROVE_DISPOSAL_L2',` add:

```typescript
  CREATE_GATE_PASS = 'CREATE_GATE_PASS',
  APPROVE_GATE_PASS = 'APPROVE_GATE_PASS',
```

In the same file, after the `ItemStatus` enum add a `GatePassStatus` enum (it does not exist yet in `types/index.ts`):

```typescript
export enum GatePassStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}
```

- [ ] **Step 2: Rewrite the gate pass service**

Replace the full contents of `inventory-UI/src/services/gatePass.service.ts`:

```typescript
import apiClient from './api.client';
import { GatePassStatus } from '@/types';

export interface GatePassUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface GatePassItem {
  id: string;
  name: string;
  barcode: string;
  status: string;
  serialNumber?: string;
  category?: string;
}

export interface GatePass {
  id: string;
  referenceNo: string;
  companyId: string;
  destination: string;
  reason?: string;
  authorizedBy?: string;
  status: GatePassStatus;
  createdByUserId: string;
  createdByUser: GatePassUser;
  approvedByUserId?: string | null;
  approvedByUser?: GatePassUser | null;
  approvedAt?: string | null;
  rejectionNotes?: string | null;
  items: GatePassItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGatePassPayload {
  itemIds: string[];
  destination: string;
  reason?: string;
  authorizedBy?: string;
}

const gatePassService = {
  create: async (payload: CreateGatePassPayload): Promise<GatePass> => {
    const { data } = await apiClient.post('/gate-passes', payload);
    return data;
  },

  getAll: async (filters?: { status?: GatePassStatus }): Promise<GatePass[]> => {
    const { data } = await apiClient.get('/gate-passes', { params: filters });
    return data;
  },

  getActive: async (): Promise<GatePass[]> => {
    const { data } = await apiClient.get('/gate-passes/active');
    return data;
  },

  getMyRequests: async (): Promise<GatePass[]> => {
    const { data } = await apiClient.get('/gate-passes/my-requests');
    return data;
  },

  getOne: async (id: string): Promise<GatePass> => {
    const { data } = await apiClient.get(`/gate-passes/${id}`);
    return data;
  },

  approve: async (id: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/approve`);
    return data;
  },

  reject: async (id: string, rejectionNotes: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/reject`, { rejectionNotes });
    return data;
  },

  cancel: async (id: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/cancel`);
    return data;
  },

  append: async (id: string, itemIds: string[]): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/append`, { itemIds });
    return data;
  },

  markReturned: async (id: string, notes?: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/return`, { notes });
    return data;
  },
};

export default gatePassService;
```

- [ ] **Step 3: Commit**

```bash
git add inventory-UI/src/types/index.ts inventory-UI/src/services/gatePass.service.ts
git commit -m "feat(gate-pass): add frontend types and updated gate pass service"
```

---

## Task 5: Fix formPrinter Reference Number Bug

**Files:**
- Modify: `inventory-UI/src/utils/formPrinter.ts` (line 447 area)

- [ ] **Step 1: Add `referenceNo` to the `GatePassInfo` interface**

In `inventory-UI/src/utils/formPrinter.ts`, replace:

```typescript
export interface GatePassInfo {
  destination: string;
  reason?: string;
  authorizedBy?: string;
}
```

with:

```typescript
export interface GatePassInfo {
  referenceNo: string;
  destination: string;
  reason?: string;
  authorizedBy?: string;
}
```

- [ ] **Step 2: Replace the random Pass No with the actual referenceNo**

In the same file, replace:

```typescript
      <p class="meta"><span class="highlight">Pass No:</span> GP-${Math.floor(1000 + Math.random() * 9000)}</p>
```

with:

```typescript
      <p class="meta"><span class="highlight">Pass No:</span> ${info.referenceNo}</p>
```

- [ ] **Step 3: Commit**

```bash
git add inventory-UI/src/utils/formPrinter.ts
git commit -m "fix(gate-pass): use actual DB referenceNo in printed gate pass — was generating random number"
```

---

## Task 6: CreateGatePassModal

**Files:**
- Create: `inventory-UI/src/features/gate-passes/CreateGatePassModal.tsx`

- [ ] **Step 1: Create the modal**

Create `inventory-UI/src/features/gate-passes/CreateGatePassModal.tsx`:

```typescript
import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, MapPin, FileText, User, Package, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import gatePassService from '@/services/gatePass.service';
import { itemService } from '@/services/item.service';
import { printGatePassForm } from '@/utils/formPrinter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
  companyLogoUrl?: string;
  mainCompanyLogoUrl?: string;
}

export default function CreateGatePassModal({
  isOpen,
  onClose,
  companyName = 'Company',
  companyLogoUrl,
  mainCompanyLogoUrl,
}: Props) {
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  const { data: warehouseItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items', { status: 'WAREHOUSE' }],
    queryFn: () => itemService.getItems({ status: 'WAREHOUSE', limit: 200 }),
    enabled: isOpen,
    select: (data: any) => Array.isArray(data) ? data : (data?.data || []),
  });

  const filtered = useMemo(() =>
    warehouseItems.filter((i: any) =>
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.barcode.toLowerCase().includes(itemSearch.toLowerCase())
    ), [warehouseItems, itemSearch]);

  const mutation = useMutation({
    mutationFn: (payload: any) => gatePassService.create(payload),
    onSuccess: async (gatePass) => {
      const itemsToPrint = gatePass.items.map((i) => ({
        name: i.name,
        barcode: i.barcode,
      }));
      await printGatePassForm(
        { name: companyName, logoUrl: companyLogoUrl, mainCompanyLogoUrl },
        itemsToPrint,
        { referenceNo: gatePass.referenceNo, destination: gatePass.destination, reason: gatePass.reason, authorizedBy: gatePass.authorizedBy },
      );
      toast.success(`Gate Pass ${gatePass.referenceNo} submitted for approval`);
      queryClient.invalidateQueries({ queryKey: ['gate-passes'] });
      handleClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to create gate pass'),
  });

  const handleClose = () => {
    setDestination('');
    setReason('');
    setAuthorizedBy('');
    setSelectedItemIds([]);
    setItemSearch('');
    onClose();
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSubmit = destination.trim() && reason.trim() && selectedItemIds.length > 0;

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100 }}
        onClick={handleClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 560, background: 'var(--bg-card)', borderRadius: 20,
        border: '1px solid var(--border-dark)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        zIndex: 1101, display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>New Gate Pass Request</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Select WAREHOUSE items and destination</p>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Destination */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Destination *
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '11px 12px 11px 36px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--text-main)', outline: 'none' }}
                placeholder="e.g. Branch Office, Colombo"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reason *
            </label>
            <div style={{ position: 'relative' }}>
              <FileText size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '11px 12px 11px 36px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--text-main)', outline: 'none' }}
                placeholder="e.g. Sent for repair, Reallocation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {/* Authorized By */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Authorized By
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '11px 12px 11px 36px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--text-main)', outline: 'none' }}
                placeholder="e.g. IT Manager"
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
              />
            </div>
          </div>

          {/* Item Picker */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Items * — {selectedItemIds.length} selected
            </label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                style={{ width: '100%', padding: '9px 10px 9px 30px', background: 'var(--bg-dark)', border: '1px solid var(--border-dark)', borderRadius: 8, fontSize: 12, color: 'var(--text-main)', outline: 'none' }}
                placeholder="Search by name or barcode..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-dark)', borderRadius: 10, background: 'var(--bg-dark)' }}>
              {loadingItems ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  <Package size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No WAREHOUSE items found</div>
                </div>
              ) : (
                filtered.map((item: any) => {
                  const selected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        cursor: 'pointer', borderBottom: '1px solid var(--border-dark)',
                        background: selected ? 'rgba(99,102,241,0.08)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {selected
                        ? <CheckSquare size={16} color="#6366f1" />
                        : <Square size={16} color="var(--text-muted)" />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.barcode}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-dark)', display: 'flex', gap: 12 }}>
          <button onClick={handleClose} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate({ itemIds: selectedItemIds, destination, reason, authorizedBy: authorizedBy || undefined })}
            style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: canSubmit ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: canSubmit ? '#fff' : 'var(--text-muted)', fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: mutation.isPending ? 0.7 : 1 }}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add inventory-UI/src/features/gate-passes/CreateGatePassModal.tsx
git commit -m "feat(gate-pass): add CreateGatePassModal with warehouse item picker"
```

---

## Task 7: GatePassesPage

**Files:**
- Create: `inventory-UI/src/features/gate-passes/GatePassesPage.tsx`

- [ ] **Step 1: Create the page**

Create `inventory-UI/src/features/gate-passes/GatePassesPage.tsx`:

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ClipboardCheck, Search, Filter, Plus } from 'lucide-react';
import { format } from 'date-fns';
import gatePassService, { GatePass } from '@/services/gatePass.service';
import { GatePassStatus, AdminPermission } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import GatePassDetailDrawer from './GatePassDetailDrawer';
import CreateGatePassModal from './CreateGatePassModal';

const columnHelper = createColumnHelper<GatePass>();

const STATUS_STYLES: Record<GatePassStatus, { bg: string; color: string; label: string }> = {
  PENDING_APPROVAL: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pending Approval' },
  ACTIVE:           { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', label: 'Active' },
  RETURNED:         { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Returned' },
  CANCELLED:        { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

function StatusBadge({ status }: { status: GatePassStatus }) {
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

export default function GatePassesPage() {
  const { hasPermission } = useAuthStore();

  const canApprove = hasPermission(AdminPermission.APPROVE_GATE_PASS);
  const isRequesterOnly = !canApprove && hasPermission(AdminPermission.CREATE_GATE_PASS);

  const [statusFilter, setStatusFilter] = useState<GatePassStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selectedPass, setSelectedPass] = useState<GatePass | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: passes = [], isLoading } = useQuery({
    queryKey: isRequesterOnly
      ? ['gate-passes', 'mine']
      : ['gate-passes', { status: statusFilter }],
    queryFn: isRequesterOnly
      ? () => gatePassService.getMyRequests()
      : () => gatePassService.getAll(statusFilter ? { status: statusFilter as GatePassStatus } : undefined),
    enabled: canApprove || isRequesterOnly,
  });

  const filtered = search
    ? passes.filter((p) =>
        p.referenceNo.toLowerCase().includes(search.toLowerCase()) ||
        p.destination.toLowerCase().includes(search.toLowerCase()) ||
        `${p.createdByUser.firstName} ${p.createdByUser.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : passes;

  const columns = [
    columnHelper.accessor('referenceNo', {
      header: 'Reference',
      cell: (info) => (
        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#818cf8' }}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('destination', {
      header: 'Destination',
      cell: (info) => <span style={{ fontSize: 13, fontWeight: 600 }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('items', {
      header: 'Items',
      cell: (info) => (
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          {info.getValue().length} item{info.getValue().length !== 1 ? 's' : ''}
        </span>
      ),
    }),
    ...(canApprove
      ? [
          columnHelper.accessor('createdByUser', {
            header: 'Requested By',
            cell: (info) => {
              const u = info.getValue();
              return <span style={{ fontSize: 13, fontWeight: 600 }}>{u.firstName} {u.lastName}</span>;
            },
          }),
        ]
      : []),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Submitted',
      cell: (info) => (
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
            {isRequesterOnly ? 'My Gate Pass Requests' : 'Gate Passes'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {isRequesterOnly
              ? 'Track the status of gate pass requests you have submitted'
              : 'Manage and approve gate pass requests'}
          </p>
        </div>
        {hasPermission(AdminPermission.CREATE_GATE_PASS) && (
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={16} />
            New Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
            placeholder={isRequesterOnly ? 'Search reference or destination...' : 'Search reference, destination, requester...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canApprove && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} style={{ color: 'var(--color-text-muted)' }} />
            <select
              style={{ padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GatePassStatus | '')}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_STYLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
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
                  <ClipboardCheck size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.4, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>No gate passes found</div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => { setSelectedPass(row.original); setIsDrawerOpen(true); }}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-dark)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {row.getVisibleCells().map((cell) => (
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

      {selectedPass && (
        <GatePassDetailDrawer
          passId={selectedPass.id}
          isOpen={isDrawerOpen}
          onClose={() => { setIsDrawerOpen(false); setSelectedPass(null); }}
        />
      )}

      <CreateGatePassModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add inventory-UI/src/features/gate-passes/GatePassesPage.tsx
git commit -m "feat(gate-pass): add GatePassesPage with role-aware views"
```

---

## Task 8: GatePassDetailDrawer

**Files:**
- Create: `inventory-UI/src/features/gate-passes/GatePassDetailDrawer.tsx`

- [ ] **Step 1: Create the drawer**

Create `inventory-UI/src/features/gate-passes/GatePassDetailDrawer.tsx`:

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ClipboardCheck, MapPin, User, Calendar, Package, AlertTriangle, Printer, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import gatePassService from '@/services/gatePass.service';
import { GatePassStatus, AdminPermission } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { printGatePassForm } from '@/utils/formPrinter';

interface Props {
  passId: string;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_STYLES: Record<GatePassStatus, { bg: string; color: string; label: string }> = {
  PENDING_APPROVAL: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pending Approval' },
  ACTIVE:           { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', label: 'Active' },
  RETURNED:         { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Returned' },
  CANCELLED:        { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

export default function GatePassDetailDrawer({ passId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuthStore();
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data: gatePass, isLoading } = useQuery({
    queryKey: ['gate-pass', passId],
    queryFn: () => gatePassService.getOne(passId),
    enabled: isOpen && !!passId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['gate-passes'] });
    queryClient.invalidateQueries({ queryKey: ['gate-pass', passId] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => gatePassService.approve(passId),
    onSuccess: () => { toast.success('Gate pass approved — items are now IN_TRANSIT'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => gatePassService.reject(passId, rejectNotes),
    onSuccess: () => { toast.success('Gate pass rejected with notes'); setShowRejectInput(false); setRejectNotes(''); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to reject'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => gatePassService.cancel(passId),
    onSuccess: () => { toast.success('Gate pass cancelled'); invalidate(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to cancel'),
  });

  const returnMutation = useMutation({
    mutationFn: () => gatePassService.markReturned(passId),
    onSuccess: () => { toast.success('Gate pass returned — items back in WAREHOUSE'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to mark returned'),
  });

  const handlePrint = async () => {
    if (!gatePass) return;
    const itemsToPrint = gatePass.items.map((i) => ({ name: i.name, barcode: i.barcode, serialNumber: (i as any).serialNumber, category: (i as any).category }));
    await printGatePassForm(
      { name: 'Company' },
      itemsToPrint,
      { referenceNo: gatePass.referenceNo, destination: gatePass.destination, reason: gatePass.reason, authorizedBy: gatePass.authorizedBy },
    );
  };

  if (!isOpen) return null;

  const canApprove = hasPermission(AdminPermission.APPROVE_GATE_PASS);
  const canCreate = hasPermission(AdminPermission.CREATE_GATE_PASS);

  const isApproveAction =
    canApprove &&
    gatePass?.status === GatePassStatus.PENDING_APPROVAL &&
    gatePass?.createdByUserId !== user?.id;

  const isCancelAction =
    canCreate &&
    gatePass?.status === GatePassStatus.PENDING_APPROVAL &&
    gatePass?.createdByUserId === user?.id;

  const isReturnAction =
    canApprove && gatePass?.status === GatePassStatus.ACTIVE;

  const canPrint =
    gatePass?.status === GatePassStatus.ACTIVE ||
    gatePass?.status === GatePassStatus.RETURNED;

  const s = gatePass ? STATUS_STYLES[gatePass.status] : null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 1100 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: 520,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border-dark)',
        zIndex: 1101, display: 'flex', flexDirection: 'column', overflowY: 'auto',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardCheck size={22} color="#818cf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                {isLoading ? '...' : gatePass?.referenceNo}
              </h2>
              {s && (
                <span style={{ padding: '2px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, border: `1px solid ${s.color}33`, textTransform: 'uppercase' as const }}>
                  {s.label}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : !gatePass ? null : (
          <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Rejection banner */}
            {gatePass.status === GatePassStatus.PENDING_APPROVAL && gatePass.rejectionNotes && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', marginBottom: 4 }}>Returned for revision</div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)' }}>{gatePass.rejectionNotes}</div>
                </div>
              </div>
            )}

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <DetailRow icon={<MapPin size={15} />} label="Destination" value={gatePass.destination} />
              {gatePass.reason && <DetailRow icon={<ClipboardCheck size={15} />} label="Reason" value={gatePass.reason} />}
              {gatePass.authorizedBy && <DetailRow icon={<User size={15} />} label="Authorized By" value={gatePass.authorizedBy} />}
              <DetailRow
                icon={<User size={15} />}
                label="Requested By"
                value={`${gatePass.createdByUser.firstName} ${gatePass.createdByUser.lastName}`}
              />
              {gatePass.approvedByUser && (
                <DetailRow
                  icon={<CheckCircle2 size={15} />}
                  label="Approved By"
                  value={`${gatePass.approvedByUser.firstName} ${gatePass.approvedByUser.lastName}`}
                />
              )}
              <DetailRow
                icon={<Calendar size={15} />}
                label="Submitted"
                value={format(new Date(gatePass.createdAt), 'MMM dd, yyyy HH:mm')}
              />
              {gatePass.approvedAt && (
                <DetailRow
                  icon={<Calendar size={15} />}
                  label="Approved"
                  value={format(new Date(gatePass.approvedAt), 'MMM dd, yyyy HH:mm')}
                />
              )}
            </div>

            {/* Items list */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10 }}>
                <Package size={13} style={{ display: 'inline', marginRight: 6 }} />
                Items ({gatePass.items.length})
              </div>
              <div style={{ border: '1px solid var(--border-dark)', borderRadius: 10, overflow: 'hidden' }}>
                {gatePass.items.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: i < gatePass.items.length - 1 ? '1px solid var(--border-dark)' : 'none',
                      background: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.barcode}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reject input */}
            {showRejectInput && (
              <div style={{ padding: 16, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#ef4444', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  Rejection Notes *
                </label>
                <textarea
                  style={{ width: '100%', padding: 12, background: 'var(--bg-dark)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--text-main)', outline: 'none', resize: 'none' as const, minHeight: 80 }}
                  placeholder="Explain why this request is being returned for revision..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectNotes(''); }}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!rejectNotes.trim() || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate()}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !rejectNotes.trim() ? 0.5 : 1 }}
                  >
                    {rejectMutation.isPending ? 'Sending...' : 'Send Back'}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
              {isApproveAction && !showRejectInput && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: approveMutation.isPending ? 0.7 : 1 }}
                  >
                    <CheckCircle2 size={16} />
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              )}

              {isCancelAction && (
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  style={{ padding: '12px 0', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}

              {isReturnAction && (
                <button
                  onClick={() => {
                    if (!window.confirm(`Mark ${gatePass.referenceNo} as RETURNED? All ${gatePass.items.length} item(s) will go back to WAREHOUSE.`)) return;
                    returnMutation.mutate();
                  }}
                  disabled={returnMutation.isPending}
                  style={{ padding: '12px 0', borderRadius: 10, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)', color: '#f59e0b', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  {returnMutation.isPending ? 'Processing...' : 'Mark as Returned'}
                </button>
              )}

              {canPrint && (
                <button
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Printer size={16} />
                  Print Gate Pass
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{value}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add inventory-UI/src/features/gate-passes/GatePassDetailDrawer.tsx
git commit -m "feat(gate-pass): add GatePassDetailDrawer with approve/reject/cancel/return/print actions"
```

---

## Task 9: Wiring — Sidebar + PermissionsModal + Router + ItemsPage Cleanup

**Files:**
- Modify: `inventory-UI/src/components/layout/Sidebar.tsx`
- Modify: `inventory-UI/src/features/users/PermissionsModal.tsx`
- Modify: `inventory-UI/src/router/index.tsx`
- Modify: `inventory-UI/src/features/items/ItemsPage.tsx`

- [ ] **Step 1: Add GATE PASSES to Sidebar**

In `inventory-UI/src/components/layout/Sidebar.tsx`, add `ClipboardCheck` to the lucide-react import:

```typescript
import {
  LayoutDashboard,
  Building2,
  Network,
  Users,
  PackageSearch,
  Tag,
  BarChart3,
  ListTodo,
  Settings,
  X,
  UserCheck,
  Trash2,
  ClipboardCheck,
} from 'lucide-react';
```

In the `MENU_ITEMS` array, after the ITEMS entry and before DISPOSALS, add:

```typescript
  { path: '/gate-passes', label: 'GATE PASSES', icon: ClipboardCheck, anyPermission: [AdminPermission.CREATE_GATE_PASS, AdminPermission.APPROVE_GATE_PASS] },
```

- [ ] **Step 2: Add Gate Pass Workflow group to PermissionsModal**

In `inventory-UI/src/features/users/PermissionsModal.tsx`, after the `'Disposal Workflow'` group, add:

```typescript
  {
    category: 'Gate Pass Workflow',
    permissions: [
      { id: AdminPermission.CREATE_GATE_PASS, label: 'Create Requests', type: 'special' as const },
      { id: AdminPermission.APPROVE_GATE_PASS, label: 'Approve / Return', type: 'special' as const },
    ],
  },
```

- [ ] **Step 3: Add /gate-passes route to router**

In `inventory-UI/src/router/index.tsx`, add the lazy import after `DisposalRequestsPage`:

```typescript
const GatePassesPage = lazy(() => import('@/features/gate-passes/GatePassesPage'));
```

Add the route after the `/disposals` route:

```typescript
{ path: '/gate-passes', element: <GatePassesPage /> },
```

- [ ] **Step 4: Remove all gate pass UI from ItemsPage**

In `inventory-UI/src/features/items/ItemsPage.tsx`:

**Remove these imports** (find and delete each line):
```typescript
import { printGatePassForm } from '@/utils/formPrinter';
import gatePassService, { GatePass } from '@/services/gatePass.service';
```

**Remove these state declarations** (find and delete):
```typescript
const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
const [gatePassMode, setGatePassMode] = useState<'new' | 'append'>('new');
const [selectedGatePassId, setSelectedGatePassId] = useState('');
const [isActiveGatePassesOpen, setIsActiveGatePassesOpen] = useState(false);
const [gatePassDetails, setGatePassDetails] = useState({
  destination: '',
  reason: '',
  authorizedBy: '',
});
```

**Remove the activeGatePasses query** (find and delete):
```typescript
const { data: activeGatePasses = [] } = useQuery({
  queryKey: ['gate-passes', 'active'],
  queryFn: () => gatePassService.getActive(),
});
```

**Remove the `handleGenerateGatePass` function** (find and delete the whole function).

**Remove the Gate Pass button** in the toolbar — find and delete the `<button>` that contains `Clock` icon and text `Gate Passes`.

**Remove the Gate Pass selection mode button** — find and delete the `<button>` that calls `handleGenerateGatePass` when items are selected.

**Remove the `{/* Gate Pass Modal */}` JSX block** — find the comment `{/* Gate Pass Modal */}` and delete the entire `{isGatePassModalOpen && ( ... )}` block.

**Remove the `{/* Active Gate Passes Tracker Panel */}` JSX block** — find the comment and delete the entire `{isActiveGatePassesOpen && ( ... )}` block.

Also remove unused lucide-react icon imports that were only used in gate pass UI (`Clock`, `CheckCircle2` — only if not used elsewhere in ItemsPage).

- [ ] **Step 5: Verify the frontend builds**

```bash
cd inventory-UI && npm run build
```

Expected: `✓ built in` with no TypeScript errors. If there are errors about missing imports (e.g., `GatePass` type used elsewhere), fix them by importing from `@/services/gatePass.service` or `@/types`.

- [ ] **Step 6: Commit**

```bash
git add inventory-UI/src/components/layout/Sidebar.tsx inventory-UI/src/features/users/PermissionsModal.tsx inventory-UI/src/router/index.tsx inventory-UI/src/features/items/ItemsPage.tsx
git commit -m "feat(gate-pass): wire up gate passes page — sidebar, router, permissions modal, remove ItemsPage gate pass UI"
```

---

## Task 10: Push to Both Remotes

- [ ] **Step 1: Push to origin and upstream**

```bash
git push origin main && git push upstream main
```

Expected: both pushes succeed with `main -> main`.

---

## Verification Checklist

After all tasks complete, verify end-to-end:

- [ ] User with `CREATE_GATE_PASS` sees GATE PASSES in sidebar, "My Gate Pass Requests" page, and New Request button
- [ ] User with `APPROVE_GATE_PASS` sees GATE PASSES in sidebar, full table with status filter, and approve/reject/return actions in drawer
- [ ] Creating a gate pass: items stay WAREHOUSE, gate pass status is PENDING_APPROVAL
- [ ] Approving: items move to IN_TRANSIT, status becomes ACTIVE
- [ ] Rejecting: notes shown as amber banner, requester can see them and resubmit (create a new request)
- [ ] Cancelling: only creator can cancel own PENDING_APPROVAL request
- [ ] Mark Returned: items go back to WAREHOUSE
- [ ] Printed gate pass shows actual referenceNo (e.g., GP-1001), not a random number
- [ ] Gate Pass buttons and modal are gone from ItemsPage
- [ ] Both `CREATE_GATE_PASS` and `APPROVE_GATE_PASS` appear in the user's Security Matrix modal under "Gate Pass Workflow"
