import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { GatePass } from './entities/gate-pass.entity';
import { Item } from './entities/item.entity';
import { ItemEvent } from './entities/item-event.entity';
import { GatePassStatus, ItemStatus, ItemEventType } from '../common/enums';
import { CreateGatePassDto, AppendToGatePassDto, ReturnGatePassDto } from './dto/gate-pass.dto';

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
        throw new BadRequestException(`Item "${item.name}" is not in WAREHOUSE status. Only WAREHOUSE items can be issued a Gate Pass.`);
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      // Generate reference number (e.g. GP-1001)
      const maxRef = await manager
        .createQueryBuilder(GatePass, 'gp')
        .select("MAX(CAST(SUBSTRING(gp.referenceNo FROM 4) AS INTEGER))", 'max')
        .getRawOne();
      const nextId = (parseInt(maxRef?.max || '1000') ) + 1;
      const referenceNo = `GP-${nextId}`;

      const gatePass = manager.create(GatePass, {
        referenceNo,
        destination: dto.destination,
        reason: dto.reason,
        authorizedBy: dto.authorizedBy,
        createdByUserId: userId,
        status: GatePassStatus.ACTIVE,
      });

      const savedGatePass = await manager.save(gatePass);

      const events: ItemEvent[] = [];
      for (const item of items) {
        const fromStatus = item.status;
        item.status = ItemStatus.IN_TRANSIT;
        item.gatePassId = savedGatePass.id;
        await manager.save(item);

        events.push(manager.create(ItemEvent, {
          itemId: item.id,
          eventType: ItemEventType.GATE_PASS_ISSUED,
          fromStatus,
          toStatus: ItemStatus.IN_TRANSIT,
          notes: `Sent to ${dto.destination} via Gate Pass ${referenceNo}. Reason: ${dto.reason || 'N/A'}. Authorized by: ${dto.authorizedBy || 'N/A'}.`,
          performedByUserId: userId,
        }));
      }

      await manager.save(events);

      return (await manager.findOne(GatePass, {
        where: { id: savedGatePass.id },
        relations: ['items'],
      }))!;
    });
  }

  async append(id: string, dto: AppendToGatePassDto, userId: string): Promise<GatePass> {
    const gatePass = await this.gatePassRepo.findOne({ where: { id } });
    if (!gatePass) throw new NotFoundException('Gate Pass not found');
    if (gatePass.status !== GatePassStatus.ACTIVE) {
      throw new BadRequestException('Cannot append to a closed Gate Pass');
    }

    if (!dto.itemIds || dto.itemIds.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const items = await this.itemsRepo.find({ where: { id: In(dto.itemIds) } });
    if (items.length !== dto.itemIds.length) {
      throw new NotFoundException('Some items were not found');
    }

    return await this.dataSource.transaction(async (manager) => {
      const events: ItemEvent[] = [];
      for (const item of items) {
        if (item.status !== ItemStatus.WAREHOUSE) {
          throw new BadRequestException(`Item "${item.name}" is not in WAREHOUSE status`);
        }

        const fromStatus = item.status;
        item.status = ItemStatus.IN_TRANSIT;
        item.gatePassId = gatePass.id;
        await manager.save(item);

        events.push(manager.create(ItemEvent, {
          itemId: item.id,
          eventType: ItemEventType.ADDED_TO_GATE_PASS,
          fromStatus,
          toStatus: ItemStatus.IN_TRANSIT,
          notes: `Appended to active Gate Pass ${gatePass.referenceNo}. Destination: ${gatePass.destination}.`,
          performedByUserId: userId,
        }));
      }

      await manager.save(events);

      return (await manager.findOne(GatePass, {
        where: { id: gatePass.id },
        relations: ['items'],
      }))!;
    });
  }

  async markReturned(id: string, dto: ReturnGatePassDto, userId: string): Promise<GatePass> {
    const gatePass = await this.gatePassRepo.findOne({ where: { id }, relations: ['items'] });
    if (!gatePass) throw new NotFoundException('Gate Pass not found');
    if (gatePass.status !== GatePassStatus.ACTIVE) {
      throw new BadRequestException('Gate Pass is not active');
    }

    return await this.dataSource.transaction(async (manager) => {
      gatePass.status = GatePassStatus.RETURNED;
      await manager.save(gatePass);

      const events: ItemEvent[] = [];
      for (const item of gatePass.items) {
        item.status = ItemStatus.WAREHOUSE;
        item.gatePassId = null;
        await manager.save(item);

        events.push(manager.create(ItemEvent, {
          itemId: item.id,
          eventType: ItemEventType.GATE_PASS_RETURNED,
          fromStatus: ItemStatus.IN_TRANSIT,
          toStatus: ItemStatus.WAREHOUSE,
          notes: `Returned from Gate Pass ${gatePass.referenceNo}. Notes: ${dto.notes || 'N/A'}.`,
          performedByUserId: userId,
        }));
      }

      await manager.save(events);

      return gatePass;
    });
  }

  async findAllActive(): Promise<GatePass[]> {
    return this.gatePassRepo.find({
      where: { status: GatePassStatus.ACTIVE },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
