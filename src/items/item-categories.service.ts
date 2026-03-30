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

    const qb = this.categoriesRepository.createQueryBuilder('cat')
      .where('cat.companyId = :companyId OR cat.companyId IS NULL', { companyId }); // include global categories

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
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.companyId !== null && category.companyId !== requesterCompanyId) { // Allow reading global categories (null)
      throw new ForbiddenException('Access denied to this category');
    }

    return category;
  }
}
