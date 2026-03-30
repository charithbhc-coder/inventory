import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { MaintenanceSchedule } from './entities/maintenance-schedule.entity';
import { MaintenanceRecord } from './entities/maintenance-record.entity';
import { MaintenanceFrequency, MaintenanceOutcome, ItemEventType, NotificationType } from '../common/enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Item } from '../items/entities/item.entity';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenanceSchedule)
    private scheduleRepository: Repository<MaintenanceSchedule>,
    @InjectRepository(MaintenanceRecord)
    private recordRepository: Repository<MaintenanceRecord>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createSchedule(dto: any, companyId: string) {
    const schedule = this.scheduleRepository.create({
      ...dto,
      companyId,
    });
    return this.scheduleRepository.save(schedule);
  }

  async findAllSchedules(companyId: string, departmentId?: string) {
    const qb = this.scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.item', 'item')
      .where('schedule.companyId = :companyId', { companyId });

    if (departmentId) {
      qb.andWhere('item.currentDepartmentId = :departmentId', { departmentId });
    }

    return qb.getMany();
  }

  async logMaintenance(scheduleId: string, dto: any, userId: string) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['item'],
    });

    if (!schedule) throw new NotFoundException('Maintenance schedule not found');

    const record = this.recordRepository.create({
      ...dto,
      scheduleId,
      itemId: schedule.itemId,
      createdByUserId: userId,
    });

    const savedRecord = await this.recordRepository.save(record);

    if (dto.outcome === MaintenanceOutcome.COMPLETED) {
      const nextDate = this.calculateNextDueDate(dto.performedAt || new Date(), schedule.frequency, schedule.customDaysInterval);
      schedule.lastMaintainedAt = dto.performedAt || new Date();
      schedule.nextDueDate = nextDate;
      await this.scheduleRepository.save(schedule);
    }

    return savedRecord;
  }

  private calculateNextDueDate(lastDate: Date, frequency: MaintenanceFrequency, interval?: number): Date {
    const date = new Date(lastDate);
    switch (frequency) {
      case MaintenanceFrequency.WEEKLY:
        date.setDate(date.getDate() + 7);
        break;
      case MaintenanceFrequency.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case MaintenanceFrequency.QUARTERLY:
        date.setMonth(date.getMonth() + 3);
        break;
      case MaintenanceFrequency.SEMI_ANNUAL:
        date.setMonth(date.getMonth() + 6);
        break;
      case MaintenanceFrequency.ANNUAL:
        date.setFullYear(date.getFullYear() + 1);
        break;
      case MaintenanceFrequency.CUSTOM:
        date.setDate(date.getDate() + (interval || 30));
        break;
    }
    return date;
  }

  @Cron('0 8 * * *') // Every day at 8 AM
  async checkMaintenanceReminders() {
    this.logger.log('Checking for maintenance reminders...');
    const now = new Date();
    const notificationWindow = new Date();
    notificationWindow.setDate(now.getDate() + 7); // Remind 7 days before

    const schedules = await this.scheduleRepository.find({
      where: {
        isActive: true,
        nextDueDate: LessThanOrEqual(notificationWindow),
      },
      relations: ['item'],
    });

    for (const schedule of schedules) {
      const isOverdue = schedule.nextDueDate < now;
      const notificationType = isOverdue ? NotificationType.ITEM_OVERDUE : NotificationType.ITEM_OVERDUE; // Could add specific type
      
      this.eventEmitter.emit('notification.create', {
        userId: schedule.assignedUserId, // Internal staff
        companyId: schedule.companyId,
        type: notificationType,
        title: isOverdue ? 'Maintenance Overdue' : 'Upcoming Maintenance',
        message: `${isOverdue ? 'Overdue' : 'Upcoming'} maintenance for ${schedule.item.name}: ${schedule.scheduleName}`,
        metadata: { itemId: schedule.itemId, scheduleId: schedule.id },
      });
    }
  }
}
