import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Create a new department within the company' })
  create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQ?: string,
  ) {
    const cid = user.role === UserRole.SUPER_ADMIN ? companyIdQ : user.companyId;
    if (!cid) {
      throw new ForbiddenException('Super Admins must provide an explicit companyId to create a department');
    }
    return this.departmentsService.create(cid, dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'List all departments in a company' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('companyId') companyIdQ?: string,
  ) {
    const cid = user.role === UserRole.SUPER_ADMIN ? companyIdQ : user.companyId;
    if (!cid && user.role === UserRole.SUPER_ADMIN) {
      // Return everything or throw; usually SA should query by company
      // but let's just make it throw to enforce strict scoping
      throw new ForbiddenException('Super Admins must pass companyId query parameter for list requests');
    }
    return this.departmentsService.findAll(cid as string, { page, limit, search });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Get details of a specific department' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.findOne(id, user.companyId as string, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Update department details' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.update(id, dto, user.companyId as string, user.role);
  }
}
