import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemCategory } from './entities/item-category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';

@Injectable()
export class ItemCategoriesService {
  constructor(
    @InjectRepository(ItemCategory)
    private readonly categoriesRepository: Repository<ItemCategory>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<ItemCategory> {
    const existing = await this.categoriesRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Category with code "${dto.code}" already exists`);
    }
    const category = this.categoriesRepository.create(dto);
    return this.categoriesRepository.save(category);
  }

  async findAll(query: { page?: number; limit?: number; search?: string; isActive?: string | boolean }) {
    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.categoriesRepository.createQueryBuilder('cat')
      .leftJoinAndSelect('cat.parent', 'parent');

    if (query.search) {
      qb.where('cat.name ILIKE :search OR cat.code ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.isActive !== undefined) {
      const activeFlag = query.isActive === 'true' || query.isActive === true;
      if (query.search) {
        qb.andWhere('cat.isActive = :isActive', { isActive: activeFlag });
      } else {
        qb.where('cat.isActive = :isActive', { isActive: activeFlag });
      }
    }

    qb.orderBy('parent.name', 'ASC', 'NULLS FIRST')
      .addOrderBy('cat.name', 'ASC')
      .skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(id: string): Promise<ItemCategory> {
    const cat = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<ItemCategory> {
    const cat = await this.findOne(id);
    Object.assign(cat, dto);
    return this.categoriesRepository.save(cat);
  }

  async remove(id: string): Promise<{ message: string }> {
    const cat = await this.findOne(id);
    cat.isActive = false;
    await this.categoriesRepository.save(cat);
    return { message: 'Category deactivated successfully' };
  }
}
