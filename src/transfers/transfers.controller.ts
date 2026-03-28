import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { InitiateTransferDto, UpdateTransferLocationDto, AcknowledgeTransferDto } from './dto/transfers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @Roles(UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Initiate a physical transfer for an item' })
  initiate(@Body() dto: InitiateTransferDto, @CurrentUser() user: JwtPayload) {
    return this.transfersService.initiate(dto, user.sub, user.companyId as string);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'List transfer histories' })
  findAll(@CurrentUser() user: JwtPayload, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.transfersService.getTransfers(user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId as string, { page, limit });
  }

  @Post(':id/update-location')
  @Roles(UserRole.WAREHOUSE_ADMIN, UserRole.REPAIR_HANDLER)
  @ApiOperation({ summary: 'Update physical location while in-transit' })
  updateLocation(@Param('id') id: string, @Body() dto: UpdateTransferLocationDto, @CurrentUser() user: JwtPayload) {
    return this.transfersService.updateLocation(id, dto, user.companyId as string);
  }

  @Post(':id/acknowledge')
  @Roles(UserRole.DEPT_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Acknowledge physical receipt of a transfer' })
  acknowledge(@Param('id') id: string, @Body() dto: AcknowledgeTransferDto, @CurrentUser() user: JwtPayload) {
    return this.transfersService.acknowledge(id, dto, user.sub, user.companyId as string);
  }
}
