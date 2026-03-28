import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Create a new user. Auto-sends temp password email.' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, user.sub, user.role, user.companyId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'List users with pagination and search' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('companyId') companyIdQ?: string,
    @Query('departmentId') departmentIdQ?: string,
    @Query('isActive') isActive?: string,
  ) {
    // If CA/DA, force limit queries to their own scope.
    // SuperAdmin can query anyone, but usually filters by companyId via query param.
    const cid = user.role === UserRole.SUPER_ADMIN ? (companyIdQ || undefined) : user.companyId;
    const did = user.role === UserRole.DEPT_ADMIN ? user.departmentId : (departmentIdQ || undefined);

    return this.usersService.findAll(cid as any, did as any, { page, limit, search, role, isActive });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user.companyId, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Update user profile/role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, dto, user.companyId, user.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Deactivate / reactivate a user' })
  setStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.setStatus(id, isActive, user.companyId, user.role);
  }
}
