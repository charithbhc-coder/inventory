import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto';
import { UserRole } from '../common/enums';
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
      throw new ConflictException(`Department code ${dto.code} already exists in your company`);
    }

    const newDept = this.departmentsRepository.create({ ...dto, companyId });
    return this.departmentsRepository.save(newDept);
  }

  async findAll(companyId: string, query: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = getPaginationOptions(query);

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

  async findOne(id: string, requesterCompanyId?: string, requesterRole?: UserRole): Promise<Department> {
    const department = await this.departmentsRepository.findOne({ where: { id } });
    if (!department) throw new NotFoundException('Department not found');

    if (requesterRole !== UserRole.SUPER_ADMIN && department.companyId !== requesterCompanyId) {
      throw new ForbiddenException('Access denied to this department');
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto, requesterCompanyId?: string, requesterRole?: UserRole): Promise<Department> {
    const department = await this.findOne(id, requesterCompanyId, requesterRole);

    Object.assign(department, dto);
    return this.departmentsRepository.save(department);
  }
}
