import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AdminPermission, UserRole } from '../common/enums';
import { JwtPayload } from '../common/interfaces';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog) private auditRepository: Repository<AuditLog>,
  ) {}

  async findAll(
    requester: JwtPayload,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      startDate?: string;
      endDate?: string;
      action?: string;
      userId?: string;
      entityType?: string;
      entityId?: string;
      companyId?: string;
    },
  ) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.auditRepository.createQueryBuilder('audit');

    const isSuperAdmin = requester.role === UserRole.SUPER_ADMIN;
    const hasAuditAccess = requester.permissions?.includes(AdminPermission.VIEW_AUDIT_LOGS);

    if (isSuperAdmin) {
      // SuperAdmin: see everything, optionally filter by company
      if (query.companyId) {
        if (query.companyId === 'none') {
          qb.andWhere('audit.companyId IS NULL');
        } else if (query.companyId !== 'all') {
          qb.andWhere('audit.companyId = :companyId', { companyId: query.companyId });
        }
      }
    } else if (hasAuditAccess) {
      // Admin WITH VIEW_AUDIT_LOGS: scoped to their company
      if (requester.companyId) {
        qb.andWhere('audit.companyId = :companyId', { companyId: requester.companyId });
      }
    } else {
      // Standard Admin WITHOUT permission: only see their own logs
      qb.andWhere('audit.userId = :userId', { userId: requester.sub });
    }

    const isValid = (val: any) => val && val !== '' && !val.includes('<') && val !== 'undefined';

    if (isValid(query.search)) {
      qb.andWhere('(audit.userEmail ILIKE :search OR audit.action ILIKE :search OR audit.entityType ILIKE :search)', { search: `%${query.search}%` });
    }

    if (isValid(query.startDate)) {
      qb.andWhere('audit.createdAt >= :startDate', { startDate: new Date(query.startDate as string) });
    }
    
    if (isValid(query.endDate)) {
      const end = new Date(query.endDate as string);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('audit.createdAt <= :endDate', { endDate: end });
    }

    if (isValid(query.action)) qb.andWhere('audit.action = :action', { action: query.action });
    // Only allow userId filter override for super admins with audit access
    if (isValid(query.userId) && (isSuperAdmin || hasAuditAccess)) {
      qb.andWhere('audit.userId = :userId', { userId: query.userId });
    }
    if (isValid(query.entityType)) qb.andWhere('audit.entityType = :entityType', { entityType: query.entityType });
    if (isValid(query.entityId)) qb.andWhere('audit.entityId = :entityId', { entityId: query.entityId });

    qb.orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }
}

