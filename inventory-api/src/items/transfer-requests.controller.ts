import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { TransferRequestsService } from './transfer-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AdminPermission } from '../common/enums';

@Controller('transfer-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransferRequestsController {
  constructor(private readonly transferRequestsService: TransferRequestsService) {}

  @Post(':itemId')
  @Permissions(AdminPermission.REQUEST_TRANSFERS)
  async createRequest(
    @Param('itemId') itemId: string,
    @Body() dto: any,
    @Request() req: any
  ) {
    return this.transferRequestsService.createRequest(req.user.sub, itemId, dto);
  }

  @Get('pending')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async getPendingRequests() {
    return this.transferRequestsService.getPendingRequests();
  }

  @Patch(':id/approve')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async approveRequest(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any
  ) {
    return this.transferRequestsService.approveRequest(id, req.user.sub, notes);
  }

  @Patch(':id/reject')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async rejectRequest(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any
  ) {
    return this.transferRequestsService.rejectRequest(id, req.user.sub, notes);
  }
}
