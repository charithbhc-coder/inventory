import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { UserRole } from '../common/enums';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog) private auditRepository: Repository<AuditLog>,
  ) {}

  async findAll(
    requesterRole: UserRole,
    requesterCompanyId: string,
    query: {
      page?: number;
      limit?: number;
      action?: string;
      userId?: string;
      entityType?: string;
      companyId?: string; // Query param for SuperAdmin
    },
  ) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.auditRepository.createQueryBuilder('audit');

    if (requesterRole !== UserRole.SUPER_ADMIN) {
      qb.where('audit.companyId = :companyId', { companyId: requesterCompanyId });
    } else if (query.companyId && query.companyId !== 'all') {
      qb.where('audit.companyId = :companyId', { companyId: query.companyId });
    }

    if (query.action) qb.andWhere('audit.action = :action', { action: query.action });
    if (query.userId) qb.andWhere('audit.userId = :userId', { userId: query.userId });
    if (query.entityType) qb.andWhere('audit.entityType = :entityType', { entityType: query.entityType });

    qb.orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }
}
