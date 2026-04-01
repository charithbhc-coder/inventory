import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Item } from '../items/entities/item.entity';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { OrderStatus, RepairStatus, RepairOutcome } from '../common/enums';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';
import { Order } from '../procurement/entities/order.entity';
import { RepairJob } from '../repairs/entities/repair-job.entity';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor) private vendorsRepository: Repository<Vendor>,
    @InjectRepository(Item) private itemsRepository: Repository<Item>,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(RepairJob) private repairsRepository: Repository<RepairJob>,
  ) {}

  async create(dto: CreateVendorDto, userId: string): Promise<Vendor> {
    // All vendors are now GLOBAL - companyId has been removed from the entity
    // We store the creator's ID for accountability
    const vendor = this.vendorsRepository.create({
      ...dto,
      createdByUserId: userId,
    });
    return this.vendorsRepository.save(vendor);
  }

  async findAll(query: { page?: number; limit?: number; search?: string; type?: string }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.vendorsRepository.createQueryBuilder('vendor');

    // Vendors are global, no company scoping required

    const isValid = (val: any) => val && val !== '' && !val.includes('<') && val !== 'undefined';

    if (isValid(query.search)) {
      qb.andWhere('vendor.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (isValid(query.type)) {
      qb.andWhere('vendor.vendorType = :type', { type: query.type });
    }

    qb.orderBy('vendor.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorsRepository.findOne({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor with ID ${id} not found`);
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);
    
    Object.assign(vendor, dto);
    return this.vendorsRepository.save(vendor);
  }

  async getPerformanceMetrics(id: string) {
    const vendor = await this.findOne(id);

    // Procurement Metrics
    const orders = await this.ordersRepository.find({
      where: { vendorId: id, status: OrderStatus.RECEIVED },
    });

    // Traceability: Recent items from this vendor
    const recentItems = await this.itemsRepository.find({
      where: { vendorId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const receivedOrders = orders.filter(o => o.actualDeliveryDate);
    const onTimeOrders = receivedOrders.filter(o => o.expectedDeliveryDate && o.actualDeliveryDate! <= o.expectedDeliveryDate);
    
    let avgDeliveryDays = 0;
    if (receivedOrders.length > 0) {
      const totalDays = receivedOrders.reduce((sum, o) => {
        const diff = new Date(o.actualDeliveryDate!).getTime() - new Date(o.createdAt).getTime();
        return sum + (diff / (1000 * 3600 * 24));
      }, 0);
      avgDeliveryDays = totalDays / receivedOrders.length;
    }

    // Repair Metrics
    const repairs = await this.repairsRepository.find({
      where: { vendorId: id, status: RepairStatus.RETURNED },
    });

    const successfulRepairs = repairs.filter(r => r.outcome === RepairOutcome.REPAIRED);
    
    let avgRepairTurnaround = 0;
    if (repairs.length > 0) {
      const totalRepairDays = repairs.reduce((sum, r) => {
        if (r.actualReturnDate && r.pickupDate) {
           const diff = new Date(r.actualReturnDate).getTime() - new Date(r.pickupDate).getTime();
           return sum + (diff / (1000 * 3600 * 24));
        }
        return sum;
      }, 0);
      avgRepairTurnaround = totalRepairDays / repairs.length;
    }

    return {
      vendor: {
        id: vendor.id,
        name: vendor.name,
      },
      recentItems, // New: traceability list
      procurement: {
        totalOrders: orders.length,
        onTimeRate: receivedOrders.length > 0 ? (onTimeOrders.length / receivedOrders.length) * 100 : 0,
        avgDeliveryDays,
      },
      repair: {
        totalJobs: repairs.length,
        successRate: repairs.length > 0 ? (successfulRepairs.length / repairs.length) * 100 : 0,
        avgTurnaroundDays: avgRepairTurnaround,
      },
      totalSpend: orders.reduce((sum, o) => sum + Number(o.totalEstimatedCost || 0), 0) + 
                  repairs.reduce((sum, r) => sum + Number(r.actualRepairCost || 0), 0)
    };
  }
}
