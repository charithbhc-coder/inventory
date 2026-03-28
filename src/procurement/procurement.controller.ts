import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { CreatePurchaseRequestDto, CreateOrderDto, RejectPrDto, ReceiveOrderDto } from './dto/procurement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('purchase-requests')
  @Roles(UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Draft a new PR' })
  createPr(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: JwtPayload) {
    return this.procurementService.createPr(dto, user.sub, user.companyId as string, user.departmentId as string);
  }

  @Post('purchase-requests/:id/submit')
  @Roles(UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Submit a DRAFT PR into the approval chain' })
  submitPr(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.procurementService.submitPr(id, user.companyId as string);
  }

  @Get('purchase-requests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'List Purchase Requests' })
  getPrs(@CurrentUser() user: JwtPayload, @Query('page') page?: number, @Query('limit') limit?: number) {
    // Basic structural limit: returning company scoped PRs
    return this.procurementService.getPrs(user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId as string, { page, limit });
  }

  @Post('purchase-requests/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Approve PR at current stage' })
  approvePr(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.procurementService.approvePr(id, user.sub, user.role, user.companyId as string);
  }

  @Post('purchase-requests/:id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Reject PR at current stage' })
  rejectPr(@Param('id') id: string, @Body() dto: RejectPrDto, @CurrentUser() user: JwtPayload) {
    return this.procurementService.rejectPr(id, dto, user.sub, user.role, user.companyId as string);
  }

  @Post('orders')
  @Roles(UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Place a vendor order from approved PRs' })
  createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.procurementService.createOrder(dto, user.sub, user.companyId as string);
  }

  @Get('orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Get all vendor orders' })
  getOrders(@CurrentUser() user: JwtPayload, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.procurementService.getOrders(user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId as string, { page, limit });
  }

  @Post('orders/:id/receive')
  @Roles(UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Receive items against a vendor order, triggers barcode generation' })
  receiveOrderItems(@Param('id') id: string, @Body() dto: ReceiveOrderDto, @CurrentUser() user: JwtPayload) {
    return this.procurementService.receiveOrderItems(id, dto, user.sub, user.companyId as string);
  }
}
