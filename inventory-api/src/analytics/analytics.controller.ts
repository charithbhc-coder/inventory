import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UserRole, AdminPermission } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';
import { CacheInterceptor } from '@nestjs/cache-manager';



@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('assets-by-company')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES, AdminPermission.VIEW_DEPARTMENTS, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_REPORTS)
  getAssetsByCompany() {
    return this.analyticsService.getAssetsByCompany();
  }

  @Get('asset-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES, AdminPermission.VIEW_DEPARTMENTS, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_REPORTS)
  getAssetStatus(@Query('companyId') companyId: string) {
    return this.analyticsService.getAssetStatusByCompany(companyId);
  }

  @Get('by-department')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_DEPARTMENTS, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_REPORTS)
  getItemsByDepartment(@Query('companyId') companyId: string) {
    return this.analyticsService.getItemsByDepartment(companyId);
  }

  @Get('by-category')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_CATEGORIES, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_REPORTS)
  getItemsByCategory(@Query('companyId') companyId?: string) {
    return this.analyticsService.getItemsByCategory(companyId);
  }

  @Get('recent-activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES, AdminPermission.VIEW_DEPARTMENTS, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_REPORTS)
  getRecentActivity(@Query('limit') limit?: number, @CurrentUser() userObj?: JwtPayload) {
    const isSuperAdmin = userObj?.role === UserRole.SUPER_ADMIN;
    const hasViewReports = userObj?.permissions?.includes(AdminPermission.VIEW_REPORTS);
    const canViewAll = isSuperAdmin || hasViewReports;
    return this.analyticsService.getRecentActivity(limit || 20, userObj?.sub, canViewAll);
  }

  @Get('audit-activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_AUDIT_LOGS, AdminPermission.VIEW_REPORTS)
  getAuditHeatmap() {
    return this.analyticsService.getSystemAuditHeatmap();
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES, AdminPermission.VIEW_DEPARTMENTS, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_REPORTS)
  getSummary() {
    return this.analyticsService.getExecutiveSummary();
  }

  @Get('repair-trends')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_REPAIRS, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_REPORTS)
  getTrends() {
    return this.analyticsService.getRepairTrends();
  }
}
