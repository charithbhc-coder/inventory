import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UserRole, AdminPermission } from '../common/enums';
import { CacheInterceptor } from '@nestjs/cache-manager';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(CacheInterceptor)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('assets-by-company')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get total assets grouped by company' })
  getAssetsByCompany() {
    return this.analyticsService.getAssetsByCompany();
  }

  @Get('asset-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get asset status overview for a company' })
  getAssetStatus(@Query('companyId') companyId: string) {
    return this.analyticsService.getAssetStatusByCompany(companyId);
  }

  @Get('by-department')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get items breakdown by department' })
  getItemsByDepartment(@Query('companyId') companyId: string) {
    return this.analyticsService.getItemsByDepartment(companyId);
  }

  @Get('by-category')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get items breakdown by category' })
  getItemsByCategory(@Query('companyId') companyId?: string) {
    return this.analyticsService.getItemsByCategory(companyId);
  }

  @Get('recent-activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get recent item activity feed' })
  getRecentActivity(@Query('limit') limit?: number) {
    return this.analyticsService.getRecentActivity(limit || 20);
  }

  @Get('audit-activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get 365 day audit log heatmap' })
  getAuditHeatmap() {
    return this.analyticsService.getSystemAuditHeatmap();
  }
}
