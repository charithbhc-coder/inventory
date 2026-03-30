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
        COUNT(i.id) FILTER (WHERE i.status = 'ASSIGNED') as "active",
        COUNT(i.id) FILTER (WHERE i.status = 'IN_REPAIR') as "inRepair",
        COUNT(i.id) FILTER (WHERE i.status = 'DISPOSED') as "disposed"
      FROM companies c
      LEFT JOIN items i ON i."companyId" = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `;
    return this.dataSource.query(query);
  }

  async getMonthlySpend() {
    const query = `
      SELECT 
        c.name as "companyName",
        TO_CHAR(o."createdAt", 'YYYY-MM') as "month",
        SUM(o."totalEstimatedCost") as "totalSpend"
      FROM orders o
      JOIN companies c ON c.id = o."companyId"
      WHERE o."createdAt" >= NOW() - INTERVAL '6 months'
        AND o.status NOT IN ('CANCELLED')
      GROUP BY c.name, "month"
      ORDER BY "month" ASC, c.name ASC
    `;
    return this.dataSource.query(query);
  }

  async getPendingApprovals() {
    const query = `
      SELECT
        COUNT(CASE WHEN status = 'SUPER_ADMIN_REQUIRED' THEN 1 END) as "totalPending",
        COUNT(CASE WHEN status = 'SUPER_ADMIN_REQUIRED' AND urgency = 'CRITICAL' THEN 1 END) as "criticalPending"
      FROM purchase_requests
    `;
    return this.dataSource.query(query);
  }

  async getAssetStatusByCompany(companyId: string) {
    const query = `
      SELECT 
        COUNT(id) FILTER (WHERE status = 'ASSIGNED') as "assigned",
        COUNT(id) FILTER (WHERE status = 'WAREHOUSE') as "warehouse",
        COUNT(id) FILTER (WHERE status = 'IN_REPAIR') as "inRepair",
        COUNT(id) FILTER (WHERE status = 'IN_TRANSIT') as "inTransit",
        COUNT(id) FILTER (WHERE status = 'DISPOSED') as "disposed"
      FROM items
      WHERE "companyId" = $1
    `;
    const res = await this.dataSource.query(query, [companyId]);
    return res[0] || { assigned: 0, warehouse: 0, inRepair: 0, inTransit: 0, disposed: 0 };
  }

  async getItemsByDepartment(companyId: string) {
    const query = `
      SELECT
        d.id as "deptId",
        d.name as "deptName",
        COUNT(i.id) FILTER (WHERE i.status = 'ASSIGNED') as "assigned",
        COUNT(i.id) FILTER (WHERE i.status = 'DISTRIBUTED' OR i.status = 'WAREHOUSE') as "unassigned",
        COUNT(i.id) FILTER (WHERE i.status = 'IN_REPAIR') as "inRepair"
      FROM departments d
      LEFT JOIN items i ON i."currentDepartmentId" = d.id
      WHERE d."companyId" = $1
      GROUP BY d.id, d.name
    `;
    return this.dataSource.query(query, [companyId]);
  }

  async getCompanyProcurementTrend(companyId: string) {
    const query = `
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM-DD') as "date",
        SUM("totalEstimatedCost") as "dailySpend"
      FROM orders
      WHERE "companyId" = $1 AND "createdAt" >= NOW() - INTERVAL '30 days'
        AND status NOT IN ('CANCELLED')
      GROUP BY "date"
      ORDER BY "date" ASC
    `;
    return this.dataSource.query(query, [companyId]);
  }

  async getCompanyRepairCategories(companyId: string) {
    const query = `
      SELECT 
        cat.name as "category",
        COUNT(r.id) as "repairCount"
      FROM repair_jobs r
      JOIN items i ON i.id = r."itemId"
      JOIN item_categories cat ON cat.id = i."categoryId"
      WHERE r."companyId" = $1
      GROUP BY cat.name
      ORDER BY "repairCount" DESC
      LIMIT 5
    `;
    return this.dataSource.query(query, [companyId]);
  }

  async getWarehouseStockLevels(companyId: string) {
    const query = `
      SELECT 
        cat.id as "categoryId",
        cat.name as "name",
        s."availableQuantity" as "available",
        s."minimumThreshold" as "minThreshold",
        s."distributedQuantity" as "distributed",
        s."totalQuantity" as "total"
      FROM warehouse_stock s
      JOIN item_categories cat ON cat.id = s."categoryId"
      WHERE s."companyId" = $1
    `;
    return this.dataSource.query(query, [companyId]);
  }

  async getWarehouseThroughput(companyId: string) {
    const query = `
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM-DD') as "date",
        COUNT(id) FILTER (WHERE "eventType" = 'RECEIVED') as "received",
        COUNT(id) FILTER (WHERE "eventType" = 'DISTRIBUTED_TO_DEPT') as "distributed"
      FROM item_events
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "date"
      ORDER BY "date" ASC
    `;
    return this.dataSource.query(query); // Simplification, normally scoped to warehouse events
  }

  async getDeptInventoryStatus(departmentId: string) {
    const query = `
      SELECT 
        COUNT(id) FILTER (WHERE status = 'ASSIGNED') as "assigned",
        COUNT(id) FILTER (WHERE status = 'DISTRIBUTED') as "unassigned",
        COUNT(id) FILTER (WHERE status = 'IN_REPAIR') as "inRepair",
        COUNT(id) FILTER (WHERE status = 'IN_TRANSIT') as "inTransit"
      FROM items
      WHERE "currentDepartmentId" = $1
    `;
    const res = await this.dataSource.query(query, [departmentId]);
    return res[0] || { assigned: 0, unassigned: 0, inRepair: 0, inTransit: 0 };
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

