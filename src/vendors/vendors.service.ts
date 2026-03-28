import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { UserRole } from '../common/enums';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor) private vendorsRepository: Repository<Vendor>,
  ) {}

  async create(dto: CreateVendorDto, companyId?: string, role?: UserRole): Promise<Vendor> {
    const cid = role === UserRole.SUPER_ADMIN ? (companyId || null) : companyId;
    const vendor = this.vendorsRepository.create({ ...dto, companyId: cid });
    return this.vendorsRepository.save(vendor);
  }

  async findAll(companyId: string | undefined, query: { page?: number; limit?: number; search?: string; type?: string }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.vendorsRepository.createQueryBuilder('vendor');

    if (companyId) {
      qb.where('(vendor.companyId = :companyId OR vendor.companyId IS NULL)', { companyId });
    }

    if (query.search) {
      qb.andWhere('vendor.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.type) {
      qb.andWhere('vendor.vendorType = :type', { type: query.type });
    }

    qb.orderBy('vendor.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(id: string, companyId?: string): Promise<Vendor> {
    const qb = this.vendorsRepository.createQueryBuilder('vendor')
      .where('vendor.id = :id', { id });
      
    if (companyId) {
      qb.andWhere('(vendor.companyId = :companyId OR vendor.companyId IS NULL)', { companyId });
    }

    const vendor = await qb.getOne();
    if (!vendor) throw new NotFoundException(`Vendor with ID ${id} not found`);
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto, companyId?: string, role?: UserRole): Promise<Vendor> {
    const vendor = await this.findOne(id, companyId);
    
    // Disallow CA from editing global vendors
    if (role !== UserRole.SUPER_ADMIN && !vendor.companyId) {
       throw new NotFoundException(`Vendor with ID ${id} not found or you lack permission to edit global vendors`);
    }

    Object.assign(vendor, dto);
    return this.vendorsRepository.save(vendor);
  }
}
