import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AnalyticsService {
  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAssetsByCompany() {
    const query = `
      SELECT 
        c.id as "companyId", 
        c.name as "companyName",
        COUNT(i.id) as "total",
        COUNT(i.id) FILTER (WHERE i.status = 'IN_USE') as "inUse",
        COUNT(i.id) FILTER (WHERE i.status = 'WAREHOUSE') as "warehouse",
        COUNT(i.id) FILTER (WHERE i.status IN ('IN_REPAIR', 'SENT_TO_REPAIR')) as "inRepair",
        COUNT(i.id) FILTER (WHERE i.status = 'DISPOSED') as "disposed",
        COUNT(i.id) FILTER (WHERE i."needsRepair" = true) as "needsRepair"
      FROM companies c
      LEFT JOIN items i ON i."companyId" = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `;
    return this.dataSource.query(query);
  }

  async getAssetStatusByCompany(companyId: string) {
    const query = `
      SELECT 
        COUNT(id) FILTER (WHERE status = 'IN_USE') as "inUse",
        COUNT(id) FILTER (WHERE status = 'WAREHOUSE') as "warehouse",
        COUNT(id) FILTER (WHERE status IN ('IN_REPAIR', 'SENT_TO_REPAIR')) as "inRepair",
        COUNT(id) FILTER (WHERE status = 'IN_TRANSIT') as "inTransit",
        COUNT(id) FILTER (WHERE status = 'DISPOSED') as "disposed",
        COUNT(id) FILTER (WHERE status = 'LOST') as "lost",
        COUNT(id) FILTER (WHERE "needsRepair" = true) as "needsRepair",
        COUNT(id) FILTER (WHERE "isWorking" = false) as "notWorking"
      FROM items
      WHERE "companyId" = $1
    `;
    const res = await this.dataSource.query(query, [companyId]);
    return res[0] || {};
  }

  async getItemsByDepartment(companyId: string) {
    const query = `
      SELECT
        d.id as "deptId",
        d.name as "deptName",
        COUNT(i.id) as "total",
        COUNT(i.id) FILTER (WHERE i.status = 'IN_USE') as "inUse",
        COUNT(i.id) FILTER (WHERE i.status IN ('IN_REPAIR', 'SENT_TO_REPAIR')) as "inRepair"
      FROM departments d
      LEFT JOIN items i ON i."departmentId" = d.id
      WHERE d."companyId" = $1
      GROUP BY d.id, d.name
    `;
    return this.dataSource.query(query, [companyId]);
  }

  async getItemsByCategory(companyId?: string) {
    let query = `
      SELECT
        cat.id as "categoryId",
        cat.name as "categoryName",
        cat.code as "categoryCode",
        COUNT(i.id) as "total",
        COUNT(i.id) FILTER (WHERE i.status = 'IN_USE') as "inUse",
        COUNT(i.id) FILTER (WHERE i.status = 'WAREHOUSE') as "warehouse"
      FROM item_categories cat
      LEFT JOIN items i ON i."categoryId" = cat.id
    `;
    const params: string[] = [];
    if (companyId) {
      query += ` WHERE (i."companyId" = $1 OR i."companyId" IS NULL)`;
      params.push(companyId);
    }
    query += ` GROUP BY cat.id, cat.name, cat.code ORDER BY "total" DESC`;
    return this.dataSource.query(query, params);
  }

  async getRecentActivity(limit = 20) {
    const query = `
      SELECT 
        ie."eventType",
        ie."createdAt",
        ie.notes,
        i.name as "itemName",
        i.barcode,
        u."firstName" || ' ' || u."lastName" as "performedBy"
      FROM item_events ie
      JOIN items i ON i.id = ie."itemId"
      JOIN users u ON u.id = ie."performedByUserId"
      ORDER BY ie."createdAt" DESC
      LIMIT $1
    `;
    return this.dataSource.query(query, [limit]);
  }

  async getSystemAuditHeatmap() {
    const query = `
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM-DD') as "date",
        COUNT(id) as "count"
      FROM audit_logs
      WHERE "createdAt" >= NOW() - INTERVAL '365 days'
      GROUP BY "date"
      ORDER BY "date" ASC
    `;
    return this.dataSource.query(query);
  }
}
