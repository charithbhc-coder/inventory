import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';
import { deleteFromS3 } from '../storage/s3.storage';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.companiesRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Company with code ${dto.code} already exists`);
    }
    const newCompany = this.companiesRepository.create(dto);
    return this.companiesRepository.save(newCompany);
  }

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.companiesRepository.createQueryBuilder('company');

    if (query.search) {
      qb.where('company.name ILIKE :search OR company.code ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('company.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async getBranding(): Promise<{ id: string; name: string; code: string; logoUrl: string | null }[]> {
    const companies = await this.companiesRepository.find({
      where: { isActive: true },
      select: ['id', 'name', 'code', 'logoUrl'],
    });
    return companies;
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.companiesRepository.save(company);
  }

  async updateLogo(id: string, fileUrl: string): Promise<{ logoUrl: string }> {
    const company = await this.findOne(id);

    if (company.logoUrl) deleteFromS3(company.logoUrl).catch(() => {});

    await this.companiesRepository.update(id, { logoUrl: fileUrl });
    return { logoUrl: fileUrl };
  }
}
