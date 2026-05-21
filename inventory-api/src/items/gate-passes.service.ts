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
    if (items.some((item) => item.companyId !== companyId)) {
      throw new BadRequestException('All items must belong to the same company.');
    }

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
      return (await manager.findOne(GatePass, {
        where: { id: gatePass.id },
        relations: ['items', 'createdByUser', 'approvedByUser'],
      }))!;
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
