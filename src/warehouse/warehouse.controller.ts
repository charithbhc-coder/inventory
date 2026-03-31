import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';
import { ReceiveItemsDto, BulkReceiveItemsDto } from '../items/dto/item.dto';

@ApiTags('Warehouse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post('create-item')
  @Roles(UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Create identical item(s) in warehouse, generates barcodes automatically' })
  createItems(@Body() dto: ReceiveItemsDto, @CurrentUser() user: JwtPayload) {
    const cid = user.role === UserRole.SUPER_ADMIN ? dto.companyId : user.companyId!;
    return this.warehouseService.receiveItems(dto, user.sub, cid as string);
  }

  @Post('create-items-bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Create unique items in warehouse (onboarding), allows manual barcodes/serial numbers' })
  createBulkItems(@Body() dto: BulkReceiveItemsDto, @CurrentUser() user: JwtPayload) {
    const cid = user.role === UserRole.SUPER_ADMIN ? dto.companyId : user.companyId!;
    return this.warehouseService.receiveBulkItems(dto, user.sub, cid as string);
  }

  @Get('stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Get stock levels by category' })
  getStockLevels(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('companyId') companyIdQ?: string,
  ) {
    const cid = user.role === UserRole.SUPER_ADMIN ? companyIdQ : user.companyId!;
    return this.warehouseService.getStockLevels(cid as any, { page, limit });
  }
}
