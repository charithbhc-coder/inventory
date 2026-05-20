import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DisposalRequestsService } from './disposal-requests.service';
import {
  CreateDisposalRequestDto,
  DisposalRequestQueryDto,
  L1ReviewDto,
  L2ApproveDto,
} from './dto/disposal-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminPermission, UserRole } from '../common/enums';
import { JwtPayload } from '../common/interfaces';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('disposal-requests')
export class DisposalRequestsController {
  constructor(private readonly service: DisposalRequestsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.REQUEST_DISPOSAL)
  create(
    @Body() dto: CreateDisposalRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_DISPOSALS)
  findAll(
    @Query() query: DisposalRequestQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? query.companyId : user.companyId;
    return this.service.findAll({ status: query.status, companyId });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_DISPOSALS)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user.companyId);
  }

  @Patch(':id/l1-review')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_DISPOSAL_L1)
  l1Review(
    @Param('id') id: string,
    @Body() dto: L1ReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.l1Review(id, dto, user.sub, user.companyId);
  }

  @Patch(':id/l2-approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_DISPOSAL_L2)
  l2Approve(
    @Param('id') id: string,
    @Body() dto: L2ApproveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.l2Approve(id, dto, user.sub, user.email, user.companyId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.REQUEST_DISPOSAL)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.cancel(id, user.sub, user.companyId);
  }
}
