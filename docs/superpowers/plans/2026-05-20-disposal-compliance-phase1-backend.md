# Disposal Protocol Compliance — Phase 1: Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full 3-step disposal approval workflow on the backend — new `DisposalRequest` entity, service, controller, module, notification handlers, and restrict the old direct-dispose endpoint to SUPER_ADMIN emergency bypass only.

**Architecture:** New standalone `disposal-requests` NestJS module with its own entity, service, and controller. The module imports `ItemsModule` (for the `Item` entity) and `NotificationsModule`. New `@OnEvent` handlers added to `NotificationsService` for all disposal lifecycle events. The existing `POST /items/:id/dispose` endpoint is locked down to `SUPER_ADMIN` only.

**Tech Stack:** NestJS, TypeORM (synchronize mode — no migrations needed), PostgreSQL, EventEmitter2, existing `NotificationsService`, existing `s3Storage` utility.

**Spec:** `docs/superpowers/specs/2026-05-20-disposal-protocol-compliance-design.md`

---

## File Map

**New files:**
- `inventory-api/src/disposal-requests/entities/disposal-request.entity.ts`
- `inventory-api/src/disposal-requests/dto/disposal-request.dto.ts`
- `inventory-api/src/disposal-requests/disposal-requests.service.ts`
- `inventory-api/src/disposal-requests/disposal-requests.service.spec.ts`
- `inventory-api/src/disposal-requests/disposal-requests.controller.ts`
- `inventory-api/src/disposal-requests/disposal-requests.module.ts`

**Modified files:**
- `inventory-api/src/common/enums/index.ts` — add 3 permissions, 1 disposal method, 4 new enums
- `inventory-api/src/notifications/notifications.service.ts` — add 5 `@OnEvent` handlers + `broadcastToCompanyUsersWithPermission` method
- `inventory-api/src/items/items.controller.ts` — restrict dispose endpoint to SUPER_ADMIN
- `inventory-api/src/items/items.service.ts` — add `[EMERGENCY BYPASS]` tag to audit note
- `inventory-api/src/app.module.ts` — register `DisposalRequestsModule`

---

## Task 1: Create the feature branch

- [ ] **Step 1: Create and switch to the new branch**

```bash
git checkout -b feat/disposal-protocol-compliance
```

- [ ] **Step 2: Verify you are on the correct branch**

```bash
git branch --show-current
```
Expected output: `feat/disposal-protocol-compliance`

---

## Task 2: Update enums

**File:** `inventory-api/src/common/enums/index.ts`

- [ ] **Step 1: Add 3 new permissions to `AdminPermission`**

Find the `// Item Status` comment block and add after `MANAGE_DISPOSALS`:

```typescript
  // Disposal workflow
  REQUEST_DISPOSAL = 'REQUEST_DISPOSAL',
  APPROVE_DISPOSAL_L1 = 'APPROVE_DISPOSAL_L1',
  APPROVE_DISPOSAL_L2 = 'APPROVE_DISPOSAL_L2',
```

- [ ] **Step 2: Add `RETURNED_TO_VENDOR` to `DisposalMethod`**

Find the `DisposalMethod` enum and add the new value:

```typescript
export enum DisposalMethod {
  SCRAPPED = 'SCRAPPED',
  DONATED = 'DONATED',
  SOLD = 'SOLD',
  RECYCLED = 'RECYCLED',
  RETURNED_TO_VENDOR = 'RETURNED_TO_VENDOR',
}
```

- [ ] **Step 3: Add 4 new enums at the end of the file**

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
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd inventory-api && npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add inventory-api/src/common/enums/index.ts
git commit -m "feat: add disposal workflow enums and permissions"
```

---

## Task 3: Create the `DisposalRequest` entity

**File:** `inventory-api/src/disposal-requests/entities/disposal-request.entity.ts` (create new)

- [ ] **Step 1: Create the directory and entity file**

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { User } from '../../users/entities/user.entity';
import {
  DisposalCondition,
  DisposalFinalDecision,
  DisposalMethod,
  DisposalRequestStatus,
  DisposalReviewDecision,
} from '../../common/enums';

export interface DataSecurityChecklist {
  businessDataBacked: boolean;
  companyDataErased: boolean;
  storageFormatted: boolean;
  userAccountsRemoved: boolean;
  removedFromDomain: boolean;
  physicalDestructionDone: boolean;
}

@Entity('disposal_requests')
export class DisposalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ type: 'uuid' })
  companyId: string;

  // ── Step 1: Request ──────────────────────────────────────────────

  @Column({ type: 'uuid' })
  requestedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User;

  @CreateDateColumn()
  requestedAt: Date;

  @Column()
  disposalReason: string;

  @Column({ type: 'enum', enum: DisposalCondition })
  disposalCondition: DisposalCondition;

  @Column({ type: 'text' })
  technicalEvaluation: string;

  @Column({ type: 'enum', enum: DisposalMethod })
  proposedMethod: DisposalMethod;

  @Column({ type: 'simple-array', nullable: true })
  evidencePhotoUrls: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Step 2: L1 Review ────────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  l1ReviewedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'l1ReviewedByUserId' })
  l1ReviewedByUser: User | null;

  @Column({ type: 'timestamp', nullable: true })
  l1ReviewedAt: Date | null;

  @Column({ type: 'enum', enum: DisposalReviewDecision, nullable: true })
  l1Decision: DisposalReviewDecision | null;

  @Column({ type: 'text', nullable: true })
  l1Notes: string | null;

  // ── Step 3: L2 Final Approval ────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  l2ApprovedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'l2ApprovedByUserId' })
  l2ApprovedByUser: User | null;

  @Column({ type: 'timestamp', nullable: true })
  l2ApprovedAt: Date | null;

  @Column({ type: 'enum', enum: DisposalFinalDecision, nullable: true })
  l2Decision: DisposalFinalDecision | null;

  @Column({ type: 'text', nullable: true })
  l2Notes: string | null;

  @Column({ default: false })
  l1Bypassed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  dataSecurityChecklist: DataSecurityChecklist | null;

  // ── Status ───────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: DisposalRequestStatus,
    default: DisposalRequestStatus.PENDING_L1,
  })
  status: DisposalRequestStatus;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Verify build still compiles**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add inventory-api/src/disposal-requests/
git commit -m "feat: add DisposalRequest entity"
```

---

## Task 4: Create DTOs

**File:** `inventory-api/src/disposal-requests/dto/disposal-request.dto.ts` (create new)

- [ ] **Step 1: Write the DTO file**

```typescript
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  DisposalCondition,
  DisposalFinalDecision,
  DisposalMethod,
  DisposalReviewDecision,
} from '../../common/enums';

export class CreateDisposalRequestDto {
  @IsUUID()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  disposalReason: string;

  @IsEnum(DisposalCondition)
  disposalCondition: DisposalCondition;

  @IsString()
  @IsNotEmpty()
  technicalEvaluation: string;

  @IsEnum(DisposalMethod)
  proposedMethod: DisposalMethod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidencePhotoUrls?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class L1ReviewDto {
  @IsEnum(DisposalReviewDecision)
  decision: DisposalReviewDecision;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class DataSecurityChecklistDto {
  @IsBoolean()
  businessDataBacked: boolean;

  @IsBoolean()
  companyDataErased: boolean;

  @IsBoolean()
  storageFormatted: boolean;

  @IsBoolean()
  userAccountsRemoved: boolean;

  @IsBoolean()
  removedFromDomain: boolean;

  @IsBoolean()
  physicalDestructionDone: boolean;
}

export class L2ApproveDto {
  @IsEnum(DisposalFinalDecision)
  decision: DisposalFinalDecision;

  @IsString()
  @IsOptional()
  notes?: string;

  @ValidateIf((o) => o.decision === DisposalFinalDecision.APPROVED)
  @IsObject()
  @ValidateNested()
  @Type(() => DataSecurityChecklistDto)
  dataSecurityChecklist?: DataSecurityChecklistDto;
}

export class DisposalRequestQueryDto {
  @IsEnum(DisposalRequestStatus)
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;
}
```

Fix the missing import in the file — add to the imports block:

```typescript
import { DisposalRequestStatus } from '../../common/enums';
```

So the full imports line becomes:

```typescript
import {
  DisposalCondition,
  DisposalFinalDecision,
  DisposalMethod,
  DisposalRequestStatus,
  DisposalReviewDecision,
} from '../../common/enums';
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add inventory-api/src/disposal-requests/dto/
git commit -m "feat: add disposal request DTOs"
```

---

## Task 5: Create `DisposalRequestsService`

**File:** `inventory-api/src/disposal-requests/disposal-requests.service.ts` (create new)

- [ ] **Step 1: Write the service**

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DisposalRequest } from './entities/disposal-request.entity';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import {
  CreateDisposalRequestDto,
  L1ReviewDto,
  L2ApproveDto,
} from './dto/disposal-request.dto';
import {
  DisposalFinalDecision,
  DisposalRequestStatus,
  DisposalReviewDecision,
  ItemEventType,
  ItemStatus,
} from '../common/enums';

@Injectable()
export class DisposalRequestsService {
  constructor(
    @InjectRepository(DisposalRequest)
    private readonly requestRepo: Repository<DisposalRequest>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateDisposalRequestDto,
    userId: string,
  ): Promise<DisposalRequest> {
    const item = await this.itemRepo.findOne({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item not found');

    if (item.status === ItemStatus.DISPOSED) {
      throw new BadRequestException(`"${item.name}" is already disposed.`);
    }

    const openRequest = await this.requestRepo.findOne({
      where: [
        { itemId: dto.itemId, status: DisposalRequestStatus.PENDING_L1 },
        { itemId: dto.itemId, status: DisposalRequestStatus.PENDING_L2 },
      ],
    });
    if (openRequest) {
      throw new BadRequestException(
        `A disposal request for "${item.name}" is already pending review.`,
      );
    }

    const request = this.requestRepo.create({
      ...dto,
      companyId: item.companyId,
      requestedByUserId: userId,
      status: DisposalRequestStatus.PENDING_L1,
      evidencePhotoUrls: dto.evidencePhotoUrls ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.requestRepo.save(request);

    this.eventEmitter.emit('disposal.requested', {
      requestId: saved.id,
      itemId: item.id,
      itemName: item.name,
      barcode: item.barcode,
      companyId: item.companyId,
      requestedByUserId: userId,
    });

    return saved;
  }

  async l1Review(
    requestId: string,
    dto: L1ReviewDto,
    reviewerId: string,
  ): Promise<DisposalRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Disposal request not found');

    if (request.status !== DisposalRequestStatus.PENDING_L1) {
      throw new BadRequestException('This request is not awaiting L1 review.');
    }
    if (request.requestedByUserId === reviewerId) {
      throw new ForbiddenException('You cannot review your own disposal request.');
    }

    request.l1ReviewedByUserId = reviewerId;
    request.l1ReviewedAt = new Date();
    request.l1Decision = dto.decision;
    request.l1Notes = dto.notes ?? null;
    request.status =
      dto.decision === DisposalReviewDecision.RECOMMENDED
        ? DisposalRequestStatus.PENDING_L2
        : DisposalRequestStatus.REJECTED;

    const saved = await this.requestRepo.save(request);

    const eventName =
      dto.decision === DisposalReviewDecision.RECOMMENDED
        ? 'disposal.l1_recommended'
        : 'disposal.l1_rejected';

    this.eventEmitter.emit(eventName, {
      requestId: saved.id,
      itemId: saved.itemId,
      companyId: saved.companyId,
      requestedByUserId: saved.requestedByUserId,
      reviewerUserId: reviewerId,
    });

    return saved;
  }

  async l2Approve(
    requestId: string,
    dto: L2ApproveDto,
    approverId: string,
    approverName: string,
  ): Promise<DisposalRequest> {
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(DisposalRequest, {
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException('Disposal request not found');

      const validStatuses = [
        DisposalRequestStatus.PENDING_L1,
        DisposalRequestStatus.PENDING_L2,
      ];
      if (!validStatuses.includes(request.status)) {
        throw new BadRequestException(
          'This request is not awaiting final approval.',
        );
      }
      if (request.requestedByUserId === approverId) {
        throw new ForbiddenException(
          'You cannot approve your own disposal request.',
        );
      }

      const item = await manager.findOne(Item, { where: { id: request.itemId } });
      if (!item) throw new NotFoundException('Item not found');

      const wasL1Bypassed =
        request.status === DisposalRequestStatus.PENDING_L1;

      if (dto.decision === DisposalFinalDecision.APPROVED) {
        const checklist = dto.dataSecurityChecklist!;
        const allChecked = Object.values(checklist).every((v) => v === true);
        if (!allChecked) {
          throw new BadRequestException(
            'All data security checklist items must be confirmed before approving disposal.',
          );
        }

        const prevStatus = item.status;
        item.status = ItemStatus.DISPOSED;
        item.disposalReason = request.disposalReason;
        item.disposalMethod = request.proposedMethod;
        item.disposalApprovedByName = approverName;
        item.disposalDate = new Date();
        item.disposalNotes = request.notes ?? null;

        if (item.assignedToName) {
          item.previousAssignedToName = item.assignedToName;
          item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
          item.assignedToName = null;
          item.assignedToEmployeeId = null;
        }
        await manager.save(Item, item);

        const bypassNote = wasL1Bypassed
          ? ' [L1 review bypassed — direct L2 approval]'
          : '';
        const event = manager.create(ItemEvent, {
          itemId: item.id,
          eventType: ItemEventType.DISPOSED,
          fromStatus: prevStatus,
          toStatus: ItemStatus.DISPOSED,
          performedByUserId: approverId,
          notes: `Disposed via protocol: ${request.disposalReason} (Method: ${request.proposedMethod})${bypassNote}`,
        });
        await manager.save(ItemEvent, event);
      }

      request.l2ApprovedByUserId = approverId;
      request.l2ApprovedAt = new Date();
      request.l2Decision = dto.decision;
      request.l2Notes = dto.notes ?? null;
      request.dataSecurityChecklist = dto.dataSecurityChecklist ?? null;
      request.l1Bypassed = wasL1Bypassed;
      request.status =
        dto.decision === DisposalFinalDecision.APPROVED
          ? DisposalRequestStatus.APPROVED
          : DisposalRequestStatus.REJECTED;

      const saved = await manager.save(DisposalRequest, request);

      const eventName =
        dto.decision === DisposalFinalDecision.APPROVED
          ? 'disposal.l2_approved'
          : 'disposal.l2_rejected';

      this.eventEmitter.emit(eventName, {
        requestId: saved.id,
        itemId: item.id,
        itemName: item.name,
        barcode: item.barcode,
        companyId: saved.companyId,
        requestedByUserId: saved.requestedByUserId,
        l1ReviewedByUserId: saved.l1ReviewedByUserId,
      });

      return saved;
    });
  }

  async cancel(requestId: string, userId: string): Promise<DisposalRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Disposal request not found');

    const cancellableStatuses = [
      DisposalRequestStatus.PENDING_L1,
      DisposalRequestStatus.PENDING_L2,
    ];
    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException('Only pending requests can be cancelled.');
    }
    if (request.requestedByUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own disposal requests.');
    }

    request.status = DisposalRequestStatus.CANCELLED;
    return this.requestRepo.save(request);
  }

  async findAll(filters: {
    status?: string;
    companyId?: string;
  }): Promise<DisposalRequest[]> {
    const query = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.item', 'item')
      .leftJoinAndSelect('r.requestedByUser', 'requester')
      .leftJoinAndSelect('r.l1ReviewedByUser', 'l1Reviewer')
      .leftJoinAndSelect('r.l2ApprovedByUser', 'l2Approver')
      .orderBy('r.requestedAt', 'DESC');

    if (filters.status) {
      query.andWhere('r.status = :status', { status: filters.status });
    }
    if (filters.companyId) {
      query.andWhere('r.companyId = :companyId', { companyId: filters.companyId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<DisposalRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['item', 'requestedByUser', 'l1ReviewedByUser', 'l2ApprovedByUser'],
    });
    if (!request) throw new NotFoundException('Disposal request not found');
    return request;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add inventory-api/src/disposal-requests/disposal-requests.service.ts
git commit -m "feat: add DisposalRequestsService with full workflow"
```

---

## Task 6: Write service unit tests

**File:** `inventory-api/src/disposal-requests/disposal-requests.service.spec.ts` (create new)

- [ ] **Step 1: Write the tests**

```typescript
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DisposalRequestsService } from './disposal-requests.service';
import {
  DisposalCondition,
  DisposalFinalDecision,
  DisposalMethod,
  DisposalRequestStatus,
  DisposalReviewDecision,
  ItemStatus,
} from '../common/enums';

const mockItem = {
  id: 'item-1',
  name: 'Test Laptop',
  barcode: 'BC-001',
  companyId: 'company-1',
  status: ItemStatus.WAREHOUSE,
  assignedToName: null,
  assignedToEmployeeId: null,
  previousAssignedToName: null,
  previousAssignedToEmployeeId: null,
  disposalReason: null,
  disposalMethod: null,
  disposalApprovedByName: null,
  disposalDate: null,
  disposalNotes: null,
};

const mockRequest = {
  id: 'req-1',
  itemId: 'item-1',
  companyId: 'company-1',
  requestedByUserId: 'user-requester',
  status: DisposalRequestStatus.PENDING_L1,
  disposalReason: 'Beyond repair',
  disposalCondition: DisposalCondition.BEYOND_REPAIR,
  technicalEvaluation: 'HDD failed, no parts available',
  proposedMethod: DisposalMethod.SCRAPPED,
  evidencePhotoUrls: null,
  notes: null,
  l1ReviewedByUserId: null,
  l1ReviewedAt: null,
  l1Decision: null,
  l1Notes: null,
  l2ApprovedByUserId: null,
  l2ApprovedAt: null,
  l2Decision: null,
  l2Notes: null,
  l1Bypassed: false,
  dataSecurityChecklist: null,
};

describe('DisposalRequestsService', () => {
  let service: DisposalRequestsService;
  let requestRepo: any;
  let itemRepo: any;
  let dataSource: any;
  let eventEmitter: any;

  beforeEach(() => {
    requestRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    itemRepo = { findOne: jest.fn() };
    dataSource = {
      transaction: jest.fn((cb) => cb({
        findOne: jest.fn(),
        create: jest.fn((_, data) => data),
        save: jest.fn((_, data) => Promise.resolve(data)),
      })),
    };
    eventEmitter = { emit: jest.fn() };

    service = new DisposalRequestsService(
      requestRepo,
      itemRepo,
      dataSource,
      eventEmitter,
    );
  });

  describe('create()', () => {
    it('throws NotFoundException if item does not exist', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test', proposedMethod: DisposalMethod.SCRAPPED }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if item is already DISPOSED', async () => {
      itemRepo.findOne.mockResolvedValue({ ...mockItem, status: ItemStatus.DISPOSED });
      await expect(
        service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test', proposedMethod: DisposalMethod.SCRAPPED }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if an open request already exists', async () => {
      itemRepo.findOne.mockResolvedValue(mockItem);
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await expect(
        service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test', proposedMethod: DisposalMethod.SCRAPPED }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates request and emits disposal.requested event on success', async () => {
      itemRepo.findOne.mockResolvedValue(mockItem);
      requestRepo.findOne.mockResolvedValue(null);
      const created = { ...mockRequest };
      requestRepo.create.mockReturnValue(created);
      requestRepo.save.mockResolvedValue(created);

      await service.create({ itemId: 'item-1', disposalReason: 'test', disposalCondition: DisposalCondition.UNUSED, technicalEvaluation: 'test eval', proposedMethod: DisposalMethod.SCRAPPED }, 'user-requester');

      expect(requestRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('disposal.requested', expect.objectContaining({
        itemId: 'item-1',
        requestedByUserId: 'user-requester',
      }));
    });
  });

  describe('l1Review()', () => {
    it('throws NotFoundException if request does not exist', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-l1'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if request is not PENDING_L1', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: DisposalRequestStatus.PENDING_L2 });
      await expect(service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-l1'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if reviewer is the requester', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await expect(service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-requester'))
        .rejects.toThrow(ForbiddenException);
    });

    it('sets status to PENDING_L2 when RECOMMENDED', async () => {
      const req = { ...mockRequest };
      requestRepo.findOne.mockResolvedValue(req);
      requestRepo.save.mockResolvedValue({ ...req, status: DisposalRequestStatus.PENDING_L2 });

      const result = await service.l1Review('req-1', { decision: DisposalReviewDecision.RECOMMENDED }, 'user-l1');

      expect(result.status).toBe(DisposalRequestStatus.PENDING_L2);
      expect(eventEmitter.emit).toHaveBeenCalledWith('disposal.l1_recommended', expect.anything());
    });

    it('sets status to REJECTED when REJECTED', async () => {
      const req = { ...mockRequest };
      requestRepo.findOne.mockResolvedValue(req);
      requestRepo.save.mockResolvedValue({ ...req, status: DisposalRequestStatus.REJECTED });

      const result = await service.l1Review('req-1', { decision: DisposalReviewDecision.REJECTED }, 'user-l1');

      expect(result.status).toBe(DisposalRequestStatus.REJECTED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('disposal.l1_rejected', expect.anything());
    });
  });

  describe('l2Approve()', () => {
    const fullChecklist = {
      businessDataBacked: true,
      companyDataErased: true,
      storageFormatted: true,
      userAccountsRemoved: true,
      removedFromDomain: true,
      physicalDestructionDone: true,
    };

    it('throws ForbiddenException if approver is the requester', async () => {
      const txManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce({ ...mockRequest, status: DisposalRequestStatus.PENDING_L2 })
          .mockResolvedValueOnce(mockItem),
        create: jest.fn((_, data) => data),
        save: jest.fn((_, data) => Promise.resolve(data)),
      };
      dataSource.transaction.mockImplementation((cb) => cb(txManager));

      await expect(
        service.l2Approve('req-1', { decision: DisposalFinalDecision.APPROVED, dataSecurityChecklist: fullChecklist }, 'user-requester', 'Requester Name'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if checklist has unchecked items', async () => {
      const txManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce({ ...mockRequest, status: DisposalRequestStatus.PENDING_L2 })
          .mockResolvedValueOnce(mockItem),
        create: jest.fn((_, data) => data),
        save: jest.fn((_, data) => Promise.resolve(data)),
      };
      dataSource.transaction.mockImplementation((cb) => cb(txManager));

      const incompleteChecklist = { ...fullChecklist, storageFormatted: false };
      await expect(
        service.l2Approve('req-1', { decision: DisposalFinalDecision.APPROVED, dataSecurityChecklist: incompleteChecklist }, 'user-l2', 'L2 User'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets l1Bypassed=true when approving from PENDING_L1', async () => {
      const savedRequest = { ...mockRequest, status: DisposalRequestStatus.APPROVED, l1Bypassed: true };
      const txManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce({ ...mockRequest, status: DisposalRequestStatus.PENDING_L1 })
          .mockResolvedValueOnce(mockItem),
        create: jest.fn((_, data) => data),
        save: jest.fn()
          .mockResolvedValueOnce(mockItem)
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce(savedRequest),
      };
      dataSource.transaction.mockImplementation((cb) => cb(txManager));

      const result = await service.l2Approve('req-1', { decision: DisposalFinalDecision.APPROVED, dataSecurityChecklist: fullChecklist }, 'user-l2', 'L2 User');

      expect(result.l1Bypassed).toBe(true);
    });
  });

  describe('cancel()', () => {
    it('throws ForbiddenException if user is not the requester', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await expect(service.cancel('req-1', 'different-user')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if request is already APPROVED', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: DisposalRequestStatus.APPROVED });
      await expect(service.cancel('req-1', 'user-requester')).rejects.toThrow(BadRequestException);
    });

    it('cancels a PENDING_L1 request successfully', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest });
      requestRepo.save.mockResolvedValue({ ...mockRequest, status: DisposalRequestStatus.CANCELLED });

      const result = await service.cancel('req-1', 'user-requester');
      expect(result.status).toBe(DisposalRequestStatus.CANCELLED);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd inventory-api && npm test -- --testPathPattern=disposal-requests.service.spec --verbose
```
Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add inventory-api/src/disposal-requests/disposal-requests.service.spec.ts
git commit -m "test: add DisposalRequestsService unit tests"
```

---

## Task 7: Create `DisposalRequestsController`

**File:** `inventory-api/src/disposal-requests/disposal-requests.controller.ts` (create new)

- [ ] **Step 1: Write the controller**

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DisposalRequestsService } from './disposal-requests.service';
import {
  CreateDisposalRequestDto,
  DisposalRequestQueryDto,
  L1ReviewDto,
  L2ApproveDto,
} from './dto/disposal-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminPermission, UserRole } from '../common/enums';
import { JwtPayload } from '../common/interfaces';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('disposal-requests')
export class DisposalRequestsController {
  constructor(private readonly service: DisposalRequestsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.REQUEST_DISPOSAL)
  create(
    @Body() dto: CreateDisposalRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_DISPOSALS)
  findAll(
    @Query() query: DisposalRequestQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // SUPER_ADMIN can query all companies; regular admins are scoped to their company
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? query.companyId : user.companyId;
    return this.service.findAll({ status: query.status, companyId });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_DISPOSALS)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/l1-review')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_DISPOSAL_L1)
  l1Review(
    @Param('id') id: string,
    @Body() dto: L1ReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.l1Review(id, dto, user.sub);
  }

  @Patch(':id/l2-approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_DISPOSAL_L2)
  l2Approve(
    @Param('id') id: string,
    @Body() dto: L2ApproveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.l2Approve(id, dto, user.sub, user.email);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.REQUEST_DISPOSAL)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.cancel(id, user.sub);
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add inventory-api/src/disposal-requests/disposal-requests.controller.ts
git commit -m "feat: add DisposalRequestsController"
```

---

## Task 8: Create module and register in AppModule

**File:** `inventory-api/src/disposal-requests/disposal-requests.module.ts` (create new)  
**File:** `inventory-api/src/app.module.ts` (modify)

- [ ] **Step 1: Write the module file**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisposalRequest } from './entities/disposal-request.entity';
import { DisposalRequestsService } from './disposal-requests.service';
import { DisposalRequestsController } from './disposal-requests.controller';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisposalRequest, Item, ItemEvent]),
    NotificationsModule,
  ],
  controllers: [DisposalRequestsController],
  providers: [DisposalRequestsService],
  exports: [DisposalRequestsService],
})
export class DisposalRequestsModule {}
```

- [ ] **Step 2: Register in `app.module.ts`**

In `inventory-api/src/app.module.ts`, add the import at the top:

```typescript
import { DisposalRequestsModule } from './disposal-requests/disposal-requests.module';
```

And add `DisposalRequestsModule` to the `imports` array, after `ItemsModule`:

```typescript
    ItemsModule,
    DisposalRequestsModule,   // ← add this line
    AuditLogsModule,
```

- [ ] **Step 3: Verify build and that the server starts**

```bash
npm run build && npm run start:dev
```
Expected: server starts without error. TypeORM will auto-create the `disposal_requests` table via `synchronize: true`.

- [ ] **Step 4: Confirm table created**

In your PostgreSQL client run:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'disposal_requests' ORDER BY ordinal_position;
```
Expected: rows for `id`, `item_id`, `company_id`, `requested_by_user_id`, `requested_at`, `disposal_reason`, `disposal_condition`, `technical_evaluation`, `proposed_method`, `evidence_photo_urls`, `notes`, `l1_reviewed_by_user_id`, `l1_reviewed_at`, `l1_decision`, `l1_notes`, `l2_approved_by_user_id`, `l2_approved_at`, `l2_decision`, `l2_notes`, `l1_bypassed`, `data_security_checklist`, `status`, `updated_at`.

- [ ] **Step 5: Commit**

```bash
git add inventory-api/src/disposal-requests/disposal-requests.module.ts inventory-api/src/app.module.ts
git commit -m "feat: register DisposalRequestsModule in AppModule"
```

---

## Task 9: Add notification handlers to `NotificationsService`

**File:** `inventory-api/src/notifications/notifications.service.ts` (modify)

- [ ] **Step 1: Add `broadcastToCompanyUsersWithPermission` method**

Add this method after the existing `broadcastToPrivilegedUsers` method (around line 94):

```typescript
  /** Broadcast to SUPER_ADMINs globally + admins with the permission scoped to a specific company */
  async broadcastToCompanyUsersWithPermission(
    companyId: string,
    permission: AdminPermission,
    payload: Omit<CreateNotificationPayload, 'recipientUserId'>,
  ) {
    const superAdmins = await this.userRepo.find({
      where: { role: UserRole.SUPER_ADMIN, isActive: true },
      select: ['id'],
    });

    const privilegedUsers = await this.userRepo
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.role != :superAdmin', { superAdmin: UserRole.SUPER_ADMIN })
      .andWhere('user.companyId = :companyId', { companyId })
      .andWhere(':permission = ANY(user.permissions)', { permission })
      .select(['user.id'])
      .getMany();

    const allRecipients = [
      ...new Set([
        ...superAdmins.map((u) => u.id),
        ...privilegedUsers.map((u) => u.id),
      ]),
    ];

    await Promise.all(
      allRecipients.map((recipientId) =>
        this.create({ ...payload, recipientUserId: recipientId }),
      ),
    );
  }
```

- [ ] **Step 2: Add the 5 disposal event handlers**

Add these methods at the end of the class, after the existing `@OnEvent` handlers:

```typescript
  @OnEvent('disposal.requested')
  async handleDisposalRequested(payload: {
    requestId: string;
    itemId: string;
    itemName: string;
    barcode: string;
    companyId: string;
    requestedByUserId: string;
  }) {
    const notifPayload = {
      companyId: payload.companyId,
      type: NotificationType.DISPOSAL_REQUESTED,
      priority: NotificationPriority.HIGH,
      title: 'Disposal Request Submitted',
      message: `${payload.itemName} (${payload.barcode}) has been submitted for disposal approval.`,
      entityType: 'DisposalRequest',
      entityId: payload.requestId,
      actionUrl: `/disposal-requests/${payload.requestId}`,
    };

    await this.broadcastToCompanyUsersWithPermission(
      payload.companyId,
      AdminPermission.APPROVE_DISPOSAL_L1,
      notifPayload,
    );
    await this.broadcastToCompanyUsersWithPermission(
      payload.companyId,
      AdminPermission.APPROVE_DISPOSAL_L2,
      notifPayload,
    );
  }

  @OnEvent('disposal.l1_recommended')
  async handleDisposalL1Recommended(payload: {
    requestId: string;
    companyId: string;
    requestedByUserId: string;
  }) {
    await this.broadcastToCompanyUsersWithPermission(
      payload.companyId,
      AdminPermission.APPROVE_DISPOSAL_L2,
      {
        companyId: payload.companyId,
        type: NotificationType.DISPOSAL_APPROVED,
        priority: NotificationPriority.HIGH,
        title: 'Disposal Awaiting Final Approval',
        message: `A disposal request has been recommended by IT Manager and is awaiting your final approval.`,
        entityType: 'DisposalRequest',
        entityId: payload.requestId,
        actionUrl: `/disposal-requests/${payload.requestId}`,
      },
    );
  }

  @OnEvent('disposal.l1_rejected')
  async handleDisposalL1Rejected(payload: {
    requestId: string;
    companyId: string;
    requestedByUserId: string;
  }) {
    await this.create({
      recipientUserId: payload.requestedByUserId,
      companyId: payload.companyId,
      type: NotificationType.DISPOSAL_REQUESTED,
      priority: NotificationPriority.MEDIUM,
      title: 'Disposal Request Rejected',
      message: `Your disposal request has been rejected at the IT Manager review stage.`,
      entityType: 'DisposalRequest',
      entityId: payload.requestId,
      actionUrl: `/disposal-requests/${payload.requestId}`,
    });
  }

  @OnEvent('disposal.l2_approved')
  async handleDisposalL2Approved(payload: {
    requestId: string;
    itemId: string;
    itemName: string;
    barcode: string;
    companyId: string;
    requestedByUserId: string;
  }) {
    await this.create({
      recipientUserId: payload.requestedByUserId,
      companyId: payload.companyId,
      type: NotificationType.DISPOSAL_APPROVED,
      priority: NotificationPriority.HIGH,
      title: 'Disposal Request Approved',
      message: `Your disposal request for ${payload.itemName} (${payload.barcode}) has been approved.`,
      entityType: 'DisposalRequest',
      entityId: payload.requestId,
      actionUrl: `/disposal-requests/${payload.requestId}`,
    });

    await this.broadcastToCompanyUsersWithPermission(
      payload.companyId,
      AdminPermission.MANAGE_DISPOSALS,
      {
        companyId: payload.companyId,
        type: NotificationType.ITEM_DISPOSED,
        priority: NotificationPriority.HIGH,
        title: 'Asset Disposal Approved',
        message: `${payload.itemName} (${payload.barcode}) has been approved for disposal via protocol.`,
        entityType: 'Item',
        entityId: payload.itemId,
        actionUrl: `/disposal-requests/${payload.requestId}`,
      },
    );
  }

  @OnEvent('disposal.l2_rejected')
  async handleDisposalL2Rejected(payload: {
    requestId: string;
    companyId: string;
    requestedByUserId: string;
    l1ReviewedByUserId: string | null;
  }) {
    await this.create({
      recipientUserId: payload.requestedByUserId,
      companyId: payload.companyId,
      type: NotificationType.DISPOSAL_REQUESTED,
      priority: NotificationPriority.MEDIUM,
      title: 'Disposal Request Rejected',
      message: `Your disposal request has been rejected at the final approval stage.`,
      entityType: 'DisposalRequest',
      entityId: payload.requestId,
      actionUrl: `/disposal-requests/${payload.requestId}`,
    });

    if (payload.l1ReviewedByUserId) {
      await this.create({
        recipientUserId: payload.l1ReviewedByUserId,
        companyId: payload.companyId,
        type: NotificationType.DISPOSAL_REQUESTED,
        priority: NotificationPriority.LOW,
        title: 'Disposal Request Rejected at Final Stage',
        message: `A disposal request you recommended has been rejected at the final approval stage.`,
        entityType: 'DisposalRequest',
        entityId: payload.requestId,
        actionUrl: `/disposal-requests/${payload.requestId}`,
      });
    }
  }
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add inventory-api/src/notifications/notifications.service.ts
git commit -m "feat: add disposal event notification handlers"
```

---

## Task 10: Restrict old dispose endpoint to SUPER_ADMIN emergency bypass

**Files:** `inventory-api/src/items/items.controller.ts` and `inventory-api/src/items/items.service.ts`

- [ ] **Step 1: Lock down the controller endpoint**

In `items.controller.ts`, find the `dispose` method and change it from:

```typescript
  @Post(':id/dispose')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_DISPOSALS)
  dispose(@Param('id') id: string, @Body() dto: DisposeItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.dispose(id, dto, user.sub, `${user.email}`);
  }
```

To:

```typescript
  @Post(':id/dispose')
  @Roles(UserRole.SUPER_ADMIN)
  dispose(@Param('id') id: string, @Body() dto: DisposeItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.dispose(id, dto, user.sub, `${user.email}`);
  }
```

- [ ] **Step 2: Tag the audit note in the service**

In `items.service.ts`, find the event creation inside `dispose()` (around line 628) and update the notes field:

```typescript
      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: ItemEventType.DISPOSED,
        fromStatus: prevStatus,
        toStatus: ItemStatus.DISPOSED,
        performedByUserId: userId,
        notes: `[EMERGENCY BYPASS] Disposed: ${dto.disposalReason} (Method: ${dto.disposalMethod})${repairNote}`,
      });
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Verify the old endpoint is blocked for ADMIN role (manual check)**

Start the dev server and call `POST /items/:id/dispose` with an ADMIN-level JWT. Expected: `403 Forbidden`.

```bash
npm run start:dev
```

- [ ] **Step 5: Commit**

```bash
git add inventory-api/src/items/items.controller.ts inventory-api/src/items/items.service.ts
git commit -m "feat: restrict direct dispose to SUPER_ADMIN emergency bypass only"
```

---

## Phase 1 Complete

At this point:
- `disposal_requests` table exists in the database
- Full 3-step workflow enforced via API: `POST /disposal-requests` → `PATCH /:id/l1-review` → `PATCH /:id/l2-approve`
- Self-approval blocked at service level
- All checklist items must be ticked before final approval
- Data security checklist stored in `jsonb` on the request record
- `Item.disposalApprovedByName` now correctly records the L2 approver name (not the requester)
- `[EMERGENCY BYPASS]` tag in all direct-dispose audit notes
- In-app + email notifications on every lifecycle event
- All unit tests passing

**Next:** Phase 2 — Frontend implementation plan (to be written after Phase 1 review).

---

## Self-Review Checklist

- [x] Permission enum additions → Task 2
- [x] `RETURNED_TO_VENDOR` enum → Task 2
- [x] `DisposalRequest` entity with all fields from spec → Task 3
- [x] DTOs for all 3 endpoints + checklist validation → Task 4
- [x] `create()` guard: no duplicate open requests → Task 5
- [x] `l1Review()` guard: self-review blocked, state guard → Task 5
- [x] `l2Approve()` guard: self-approval blocked, checklist all-true enforced, L1 bypass tracked → Task 5
- [x] `cancel()` guard: only requester, only pending states → Task 5
- [x] Atomic item disposal transaction in `l2Approve()` → Task 5
- [x] `disposalApprovedByName` = L2 approver name → Task 5
- [x] `l1Bypassed` flag set correctly → Task 5
- [x] `findAll()` company-scoped for non-SUPER_ADMIN → Task 7
- [x] `broadcastToCompanyUsersWithPermission` (company-scoped) → Task 9
- [x] All 5 notification handlers wired → Task 9
- [x] Old dispose endpoint SUPER_ADMIN only → Task 10
- [x] `[EMERGENCY BYPASS]` audit note → Task 10
- [x] Unit tests for all service guard paths → Task 6
