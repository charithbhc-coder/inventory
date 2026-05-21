import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GatePassesService } from './gate-passes.service';
import {
  CreateGatePassDto,
  AppendToGatePassDto,
  ReturnGatePassDto,
  RejectGatePassDto,
  GatePassQueryDto,
} from './dto/gate-pass.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminPermission, GatePassStatus, UserRole } from '../common/enums';
import { JwtPayload } from '../common/interfaces';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('gate-passes')
export class GatePassesController {
  constructor(private readonly service: GatePassesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  create(@Body() dto: CreateGatePassDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  findAll(@Query() query: GatePassQueryDto, @CurrentUser() user: JwtPayload) {
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId;
    return this.service.findAll({ status: query.status, companyId });
  }

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  findPending(@CurrentUser() user: JwtPayload) {
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId;
    return this.service.findAll({ status: GatePassStatus.PENDING_APPROVAL, companyId });
  }

  @Get('my-requests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  findMyRequests(@CurrentUser() user: JwtPayload) {
    return this.service.findMyRequests(
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Get('active')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  findActive(@CurrentUser() user: JwtPayload) {
    const companyId =
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId;
    return this.service.findAll({
      status: GatePassStatus.ACTIVE,
      companyId,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS, AdminPermission.CREATE_GATE_PASS)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(
      id,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.approve(
      id,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectGatePassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reject(
      id,
      dto,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.cancel(
      id,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/append')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_GATE_PASS)
  append(
    @Param('id') id: string,
    @Body() dto: AppendToGatePassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.append(
      id,
      dto,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }

  @Post(':id/return')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.APPROVE_GATE_PASS)
  markReturned(
    @Param('id') id: string,
    @Body() dto: ReturnGatePassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.markReturned(
      id,
      dto,
      user.sub,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.companyId,
    );
  }
}
