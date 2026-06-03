import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request, Query } from '@nestjs/common';
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

  @Get('history')
  @Permissions(AdminPermission.APPROVE_TRANSFERS)
  async getHistory(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.transferRequestsService.getHistory(parsedPage, parsedLimit);
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

  @Delete(':itemId/cancel')
  @Permissions(AdminPermission.REQUEST_TRANSFERS)
  async cancelRequest(
    @Param('itemId') itemId: string,
    @Request() req: any
  ) {
    return this.transferRequestsService.cancelRequest(itemId, req.user.sub);
  }
}
