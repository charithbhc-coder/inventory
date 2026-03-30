import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DepreciationService } from './depreciation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Depreciation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('depreciation')
export class DepreciationController {
  constructor(private readonly depreciationService: DepreciationService) {}

  @Get('report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get current asset valuation and depreciation report' })
  async getReport(@CurrentUser() user: JwtPayload, @Query('companyId') qCompanyId?: string) {
    const companyId = user.role === UserRole.SUPER_ADMIN ? (qCompanyId || '') : (user.companyId || '');
    return this.depreciationService.getDepreciationReport(companyId);
  }

  @Post('trigger-manual')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually trigger monthly depreciation calculation (Super Admin only)' })
  async triggerManual() {
    await this.depreciationService.handleMonthlyDepreciation();
    return { message: 'Depreciation calculation triggered successfully' };
  }
}
