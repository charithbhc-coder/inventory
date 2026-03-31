import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { DistributeItemDto, AssignItemDto, ReportFaultDto } from './dto/item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ItemStatus, UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'List all items matching criteria' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: ItemStatus,
    @Query('categoryId') categoryId?: string,
    @Query('companyId') companyIdQ?: string,
  ) {
    const cid = user.role === UserRole.SUPER_ADMIN ? companyIdQ : user.companyId!;
    // For DEPT_ADMIN we could restrict, but maybe they can see company items? Restricting for now:
    const myDept = user.role === UserRole.DEPT_ADMIN ? user.departmentId : undefined;
    return this.itemsService.findAll(cid as any, { page, limit, search, status, categoryId, departmentId: myDept });
  }

  @Get(':barcodeOrId')
  @ApiOperation({ summary: 'Get item details AND full AliExpress timeline' })
  findOne(@Param('barcodeOrId') barcodeOrId: string, @CurrentUser() user: JwtPayload) {
    return this.itemsService.getTimeline(barcodeOrId, user.companyId!, user.role);
  }

  @Post(':id/distribute')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Distribute a warehouse item to a department' })
  distribute(@Param('id') id: string, @Body() dto: DistributeItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.distribute(id, dto, user.sub, user.companyId || '', user.role);
  }

  @Post(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Assign a distributed item to a staff user' })
  assign(@Param('id') id: string, @Body() dto: AssignItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.assign(id, dto, user.sub, user.departmentId || '', user.role); 
  }

  @Post(':id/report-fault')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.STAFF, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Report a fault on an item' })
  reportFault(@Param('id') id: string, @Body() dto: ReportFaultDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.reportFault(id, dto, user.sub, user.role);
  }

  @Post(':id/acknowledge')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.STAFF, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Acknowledge receipt of a distributed or assigned item' })
  acknowledge(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.itemsService.acknowledge(id, user.sub, user.role, user.departmentId || '');
  }
}
