import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ItemCategory } from './entities/item-category.entity';
import { CreateItemCategoryDto, UpdateItemCategoryDto } from './dto/create-category.dto';
import { UserRole } from '../common/enums';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';

@Injectable()
export class ItemCategoriesService {
  constructor(
    @InjectRepository(ItemCategory)
    private readonly categoriesRepository: Repository<ItemCategory>,
  ) {}

  async create(dto: CreateItemCategoryDto, companyId?: string, requesterRole?: UserRole): Promise<ItemCategory> {
    const cid = requesterRole === UserRole.SUPER_ADMIN ? (companyId || null) : companyId;
    
    // cid calculation: If SuperAdmin does not provide companyId, it means they are creating a global category (companyId = null)
    // If a CA requests, companyId is injected from token, making it a company-scoped category.

    const existing = await this.categoriesRepository.findOne({
      where: [
        { code: dto.code, companyId: cid === null ? IsNull() : cid },
        { code: dto.code, companyId: IsNull() } 
      ]
    });

    if (existing) {
      throw new ConflictException(`Category code ${dto.code} already exists`);
    }

    const newCategory = this.categoriesRepository.create({ ...dto, companyId: cid as string });
    return this.categoriesRepository.save(newCategory);
  }

  async findAll(companyId: string, query: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = getPaginationOptions(query);

    // Bulletproof: If companyId is not a valid UUID (e.g. Postman's <string> placeholder), return empty result instead of 500
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (companyId && !uuidRegex.test(companyId)) {
        return paginate([], 0, page, limit);
    }

    const qb = this.categoriesRepository.createQueryBuilder('cat');
    
    if (companyId) {
        // If a companyId is provided, show that company's categories + Global ones
        qb.where('cat.companyId = :companyId OR cat.companyId IS NULL', { companyId });
    } else {
        // If NO companyId is provided, we assume the Super Admin wants to see 
        // EVERYTHING (Global + all Company-specific categories).
        // For non-super admins, the controller enforces a companyId, so this is safe.
    }

    if (query.search) {
        qb.andWhere('(cat.name ILIKE :search OR cat.code ILIKE :search)', {
            search: `%${query.search}%`,
        });
    }

    qb.orderBy('cat.name', 'ASC')
        .skip(skip)
        .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(id: string, requesterCompanyId: string): Promise<ItemCategory> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) throw new NotFoundException('Category not found');

    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.companyId !== null && category.companyId !== requesterCompanyId) { 
      throw new ForbiddenException('Access denied to this category');
    }

    return category;
  }

  async update(id: string, dto: UpdateItemCategoryDto, requesterCompanyId: string, requesterRole: UserRole): Promise<ItemCategory> {
    const category = await this.findOne(id, requesterCompanyId);
    
    // Regular Company/Warehouse admins can only edit categories belonging to their company.
    // System (Global) categories (companyId = null) can only be edited by Super Admin.
    if (category.companyId === null && requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can edit global categories');
    }

    Object.assign(category, dto);
    return this.categoriesRepository.save(category);
  }
}
