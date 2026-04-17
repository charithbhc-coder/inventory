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
        COUNT(i.id) FILTER (WHERE i.status = 'LOST') as "lost",
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
        SUM(i."purchasePrice") as "totalValue",
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
    query += ` GROUP BY cat.id, cat.name, cat.code ORDER BY "totalValue" DESC NULLS LAST`;
    return this.dataSource.query(query, params);
  }

  async getExecutiveSummary() {
    const query = `
      SELECT
        COUNT(id) as "totalItems",
        SUM("purchasePrice") as "totalValue",
        COUNT(id) FILTER (WHERE "needsRepair" = true OR status = 'LOST') as "activeAlerts",
        COUNT(id) FILTER (WHERE "isWorking" = true) as "workingItems",
        (SELECT COUNT(*) FROM item_events WHERE "eventType" = 'SENT_TO_REPAIR' AND "createdAt" >= date_trunc('month', now())) as "repairsThisMonth"
      FROM items
    `;
    const res = await this.dataSource.query(query);
    return res[0] || {};
  }

  async getRepairTrends() {
    const query = `
      WITH RECURSIVE months AS (
        SELECT date_trunc('month', now() - interval '11 months') as month
        UNION ALL
        SELECT month + interval '1 month' FROM months WHERE month < date_trunc('month', now())
      )
      SELECT 
        TO_CHAR(m.month, 'Mon') as "monthName",
        m.month as "monthDate",
        COALESCE(count(ie.id), 0) as "count"
      FROM months m
      LEFT JOIN item_events ie ON date_trunc('month', ie."createdAt") = m.month 
        AND ie."eventType" = 'SENT_TO_REPAIR'
      GROUP BY m.month
      ORDER BY m.month ASC
    `;
    return this.dataSource.query(query);
  }

  async getRecentActivity(limit = 20, userId?: string, canViewAll = true) {
    const reportActions = [
      'CREATE_SEND_EMAIL', 'CREATE_SCHEDULED', 'UPDATE_SCHEDULED', 'DELETE_SCHEDULED',
      'CREATE_SCHEDULES', 'UPDATE_SCHEDULES', 'DELETE_SCHEDULES',
      'SEND_EMAIL', 'UPDATE_SCHEDULED_REPORTS', 'CREATE_SCHEDULED_REPORTS',
      'GENERATE_EXCEL', 'GENERATE_PDF'
    ];
    const actionsList = reportActions.map(a => `'${a}'`).join(', ');

    const params: any[] = [limit];
    if (!canViewAll && userId) params.push(userId);

    // NOTE: ie."eventType" is a PostgreSQL enum — must cast to ::text for UNION compatibility
    const query = `
      SELECT * FROM (
        (SELECT 
          ie."eventType"::text    AS "eventType",
          ie."createdAt"::timestamptz AS "createdAt",
          ie.notes::text          AS notes,
          ie."toPersonName"::text AS "toPersonName",
          ie."fromPersonName"::text AS "fromPersonName",
          i.name::text            AS "itemName",
          i.barcode::text         AS barcode,
          COALESCE(u."firstName" || ' ' || u."lastName", 'Unknown') AS "performedBy",
          'item'::text            AS "source"
        FROM item_events ie
        INNER JOIN items i ON i.id = ie."itemId"
        LEFT JOIN users u ON u.id = ie."performedByUserId"
        ${!canViewAll && userId ? 'WHERE ie."performedByUserId" = $2' : ''}
        ORDER BY ie."createdAt" DESC
        LIMIT $1)
        
        UNION ALL
        
        (SELECT 
          al.action::text         AS "eventType",
          al."createdAt"::timestamptz AS "createdAt",
          al.action::text         AS notes,
          NULL::text              AS "toPersonName",
          NULL::text              AS "fromPersonName",
          'System'::text          AS "itemName",
          NULL::text              AS barcode,
          COALESCE(u."firstName" || ' ' || u."lastName", 'System') AS "performedBy",
          'audit'::text           AS "source"
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al."userId"::uuid
        WHERE al.action IN (${actionsList})
        ${!canViewAll && userId ? 'AND al."userId"::uuid = $2' : ''}
        ORDER BY al."createdAt" DESC
        LIMIT $1)
      ) sub
      ORDER BY sub."createdAt" DESC
      LIMIT $1
    `;

    return this.dataSource.query(query, params);
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
