import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('schedules')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Create a preventive maintenance schedule' })
  async createSchedule(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.createSchedule(dto, user.companyId || '');
  }

  @Get('schedules')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'List all maintenance schedules' })
  async findAllSchedules(@CurrentUser() user: JwtPayload, @Query('departmentId') departmentId?: string) {
    return this.maintenanceService.findAllSchedules(user.companyId || '', departmentId);
  }

  @Post('records/:scheduleId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Log maintenance work done' })
  async logMaintenance(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.maintenanceService.logMaintenance(scheduleId, dto, user.sub);
  }
}
