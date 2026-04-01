import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RepairsService } from './repairs.service';
import { CreateRepairJobDto, ApproveRepairJobDto, UpdateRepairStatusDto, CreateDisposalRequestDto, ProcessDisposalDto } from './dto/repairs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Repairs & Disposals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post('repair-jobs')
  @Roles(UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Submit a new repair request' })
  createJob(@Body() dto: CreateRepairJobDto, @CurrentUser() user: JwtPayload) {
    return this.repairsService.createRepairJob(dto, user.sub, user.companyId as string, user.departmentId as string);
  }

  @Get('repair-jobs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN, UserRole.REPAIR_HANDLER)
  @ApiOperation({ summary: 'List repair jobs' })
  getJobs(@CurrentUser() user: JwtPayload, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.repairsService.getJobs(user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId as string, { page, limit });
  }

  @Post('repair-jobs/:id/approve')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve and assign a repair job' })
  approveJob(@Param('id') id: string, @Body() dto: ApproveRepairJobDto, @CurrentUser() user: JwtPayload) {
    return this.repairsService.approveAndAssign(id, dto, user.sub, user.companyId as string);
  }

  @Post('repair-jobs/:id/update-status')
  @Roles(UserRole.REPAIR_HANDLER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Update timeline status of a repair job' })
  updateJob(@Param('id') id: string, @Body() dto: UpdateRepairStatusDto, @CurrentUser() user: JwtPayload) {
    return this.repairsService.updateJobStatus(id, dto, user.sub, user.companyId as string);
  }

  @Get('disposal-requests')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List disposal requests' })
  getDisposals(@CurrentUser() user: JwtPayload, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.repairsService.getDisposals(user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId as string, { page, limit });
  }

  @Post('disposal-requests')
  @Roles(UserRole.DEPT_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Raise a disposal request for an item' })
  createDisposal(@Body() dto: CreateDisposalRequestDto, @CurrentUser() user: JwtPayload) {
    return this.repairsService.createDisposal(dto, user.sub, user.companyId as string);
  }

  @Post('disposal-requests/:id/process')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve/Reject disposal and auto-issue replacement PR' })
  processDisposal(@Param('id') id: string, @Body() dto: ProcessDisposalDto, @CurrentUser() user: JwtPayload) {
    return this.repairsService.processDisposal(id, dto, user.sub, user.companyId as string);
  }
}
