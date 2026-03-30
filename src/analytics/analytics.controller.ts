import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CacheInterceptor)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sa/assets-by-company')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get total assets grouped by company (Super Admin)' })
  getAssetsByCompany() {
    return this.analyticsService.getAssetsByCompany();
  }

  @Get('sa/monthly-spend')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get monthly procurement spend across all companies' })
  getMonthlySpend() {
    return this.analyticsService.getMonthlySpend();
  }

  @Get('sa/pending-approvals')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get global pending approvals KPI' })
  getPendingApprovals() {
    return this.analyticsService.getPendingApprovals();
  }

  @Get('ca/asset-status')
  @Roles(UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get asset status overview for a company' })
  getAssetStatus(@CurrentUser() user: User) {
    if (!user.companyId) return null;
    return this.analyticsService.getAssetStatusByCompany(user.companyId);
  }

  @Get('ca/by-department')
  @Roles(UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get items breakdown by department' })
  getItemsByDepartment(@CurrentUser() user: User) {
    if (!user.companyId) return [];
    return this.analyticsService.getItemsByDepartment(user.companyId);
  }

  @Get('ca/procurement-trend')
  @Roles(UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get monthly procurement trend for a company' })
  getProcurementTrend(@CurrentUser() user: User) {
    if (!user.companyId) return [];
    return this.analyticsService.getCompanyProcurementTrend(user.companyId);
  }

  @Get('ca/repair-by-category')
  @Roles(UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get top 5 repair categories' })
  getRepairCategories(@CurrentUser() user: User) {
    if (!user.companyId) return [];
    return this.analyticsService.getCompanyRepairCategories(user.companyId);
  }

  @Get('wh/stock-levels')
  @Roles(UserRole.WAREHOUSE_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get warehouse stock vs minimum thresholds' })
  getStockLevels(@CurrentUser() user: User) {
    if (!user.companyId) return [];
    return this.analyticsService.getWarehouseStockLevels(user.companyId);
  }

  @Get('wh/flow')
  @Roles(UserRole.WAREHOUSE_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get warehouse 30-day receiving/distribution flow' })
  getWarehouseFlow(@CurrentUser() user: User) {
    if (!user.companyId) return [];
    return this.analyticsService.getWarehouseThroughput(user.companyId);
  }

  @Get('da/inventory-status')
  @Roles(UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Get department specific statuses' })
  getDeptInventoryStatus(@CurrentUser() user: User) {
    if (!user.departmentId) return null;
    return this.analyticsService.getDeptInventoryStatus(user.departmentId);
  }

  @Get('sa/audit-activity')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get 365 day audit log heatmap' })
  getAuditHeatmap() {
    return this.analyticsService.getSystemAuditHeatmap();
  }
}
