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

    // Scoping logic
    // Scoping logic
    if (requesterRole !== UserRole.SUPER_ADMIN) {
      qb.andWhere('audit.companyId = :companyId', { companyId: requesterCompanyId });
    } else if (query.companyId) {
      if (query.companyId === 'none') {
        qb.andWhere('audit.companyId IS NULL');
      } else if (query.companyId !== 'all') {
        qb.andWhere('audit.companyId = :companyId', { companyId: query.companyId });
      }
    }

    const isValid = (val: any) => val && val !== '' && !val.includes('<') && val !== 'undefined';

    if (isValid(query.action)) qb.andWhere('audit.action = :action', { action: query.action });
    if (isValid(query.userId)) qb.andWhere('audit.userId = :userId', { userId: query.userId });
    if (isValid(query.entityType)) qb.andWhere('audit.entityType = :entityType', { entityType: query.entityType });

    qb.orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }
}
