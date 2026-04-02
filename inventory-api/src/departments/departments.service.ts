import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentsRepository: Repository<Department>,
  ) {}

  async create(companyId: string, dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentsRepository.findOne({
      where: { code: dto.code, companyId },
    });
    if (existing) {
      throw new ConflictException(`Department code ${dto.code} already exists in this company`);
    }

    const newDept = this.departmentsRepository.create({ ...dto, companyId });
    return this.departmentsRepository.save(newDept);
  }

  async findAll(companyId: string, query: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = getPaginationOptions(query);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      return paginate([], 0, page, limit);
    }

    const qb = this.departmentsRepository.createQueryBuilder('department');
    qb.where('department.companyId = :companyId', { companyId });

    if (query.search) {
      qb.andWhere('(department.name ILIKE :search OR department.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('department.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findOne({ where: { id } });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    Object.assign(department, dto);
    return this.departmentsRepository.save(department);
  }
}
