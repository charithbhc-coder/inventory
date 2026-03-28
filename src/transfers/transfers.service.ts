import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Transfer } from './entities/transfer.entity';
import { InitiateTransferDto, UpdateTransferLocationDto, AcknowledgeTransferDto } from './dto/transfers.dto';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { TransferStatus, TransferType, ItemStatus, ItemEventType } from '../common/enums';
import { format } from 'date-fns';
import { getPaginationOptions, paginate } from '../common/utils/pagination.util';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer) private transferRepository: Repository<Transfer>,
    private dataSource: DataSource,
  ) {}

  private async generateTransferNumber(companyId: string): Promise<string> {
    const year = format(new Date(), 'yyyy');
    const count = await this.transferRepository.count({ where: { fromCompanyId: companyId } });
    return `TRF-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async initiate(dto: InitiateTransferDto, userId: string, companyId: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
       const item = await manager.findOne(Item, { where: { id: dto.itemId, companyId } });
       if (!item) throw new NotFoundException('Item not found');

       const transferNumber = await this.generateTransferNumber(companyId);

       const transfer = manager.create(Transfer, {
         transferNumber,
         itemId: item.id,
         transferType: dto.transferType,
         fromCompanyId: companyId,
         fromDepartmentId: dto.fromDepartmentId,
         fromLocation: dto.fromLocation || item.currentLocation,
         toCompanyId: companyId,
         toDepartmentId: dto.toDepartmentId,
         toLocation: dto.toLocation,
         initiatedByUserId: userId,
         currentHolderUserId: dto.currentHolderUserId || userId,
         status: TransferStatus.IN_TRANSIT,
         handoffNotes: dto.handoffNotes,
       });

       const savedTransfer = await manager.save(Transfer, transfer);

       // Mark item in transit
       const event = manager.create(ItemEvent, {
         itemId: item.id,
         eventType: ItemEventType.NOTES_UPDATED,
         fromStatus: item.status,
         toStatus: ItemStatus.IN_TRANSIT,
         performedByUserId: userId,
         toLocation: 'In Transit',
         notes: `Transfer ${transferNumber} initiated.`,
         referenceId: savedTransfer.id,
       });

       item.status = ItemStatus.IN_TRANSIT;
       await manager.save(Item, item);
       await manager.save(ItemEvent, event);

       return savedTransfer;
    });
  }

  async updateLocation(id: string, dto: UpdateTransferLocationDto, companyId: string) {
     const transfer = await this.transferRepository.findOne({ where: { id, fromCompanyId: companyId }, relations: ['item'] });
     if (!transfer) throw new NotFoundException('Transfer not found');
     
     if (transfer.status !== TransferStatus.IN_TRANSIT) {
        throw new BadRequestException('Transfer must be IN_TRANSIT to update location');
     }

     if (dto.handoffNotes) {
         transfer.handoffNotes = transfer.handoffNotes ? `${transfer.handoffNotes} | ${dto.handoffNotes}` : dto.handoffNotes;
     }

     // Can optionally update `transfer.item.currentLocation` but typically waits for ack
     return this.transferRepository.save(transfer);
  }

  async acknowledge(id: string, dto: AcknowledgeTransferDto, userId: string, companyId: string) {
      return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
         const transfer = await manager.findOne(Transfer, { where: { id, toCompanyId: companyId } });
         if (!transfer) throw new NotFoundException('Transfer not found');
         if (transfer.status !== TransferStatus.IN_TRANSIT && transfer.status !== TransferStatus.DELIVERED) {
            throw new BadRequestException('Transfer cannot be acknowledged');
         }

         transfer.status = TransferStatus.ACKNOWLEDGED;
         transfer.acknowledgedAt = new Date();
         transfer.acknowledgedByUserId = userId;
         if (dto.notes) transfer.handoffNotes = transfer.handoffNotes ? `${transfer.handoffNotes} | ${dto.notes}` : dto.notes;

         const item = await manager.findOne(Item, { where: { id: transfer.itemId } });
         if (item) {
            let newStatus = ItemStatus.DISTRIBUTED;
            if (transfer.transferType === TransferType.DEPT_TO_WAREHOUSE || transfer.transferType === TransferType.REPAIR_TO_WAREHOUSE) {
                newStatus = ItemStatus.WAREHOUSE;
            } else if (transfer.transferType === TransferType.DEPT_TO_REPAIR || transfer.transferType === TransferType.WAREHOUSE_TO_REPAIR) {
                newStatus = ItemStatus.IN_REPAIR;
            }

            item.status = newStatus;
            item.currentDepartmentId = transfer.toDepartmentId as any;
            if (transfer.toLocation) item.currentLocation = transfer.toLocation;

            const event = manager.create(ItemEvent, {
               itemId: item.id,
               eventType: ItemEventType.DEPT_ACKNOWLEDGED,
               fromStatus: ItemStatus.IN_TRANSIT,
               toStatus: newStatus,
               performedByUserId: userId,
               toLocation: item.currentLocation,
               referenceId: transfer.id,
               notes: 'Transfer legally acknowledged via signature/system.',
               toDepartmentId: item.currentDepartmentId || undefined,
            });

            await manager.save(Item, item);
            await manager.save(ItemEvent, event);
         }

         return manager.save(Transfer, transfer);
      });
  }

  async getTransfers(companyId: string | undefined, query: { page?: number; limit?: number }) {
      const { page, limit, skip } = getPaginationOptions(query);
      const qb = this.transferRepository.createQueryBuilder('trf')
         .leftJoinAndSelect('trf.item', 'item')
         .leftJoinAndSelect('trf.initiatedByUser', 'user');

      if (companyId) qb.where('(trf.fromCompanyId = :companyId OR trf.toCompanyId = :companyId)', { companyId });

      qb.orderBy('trf.createdAt', 'DESC').skip(skip).take(limit);

      const [items, total] = await qb.getManyAndCount();
      return paginate(items, total, page, limit);
  }
}
