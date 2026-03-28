import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Add a new vendor' })
  create(
    @Body() dto: CreateVendorDto,
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQ?: string,
  ) {
    return this.vendorsService.create(dto, user.role === UserRole.SUPER_ADMIN ? companyIdQ : user.companyId, user.role);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'List all vendors' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('companyId') companyIdQ?: string,
  ) {
    const cid = user.role === UserRole.SUPER_ADMIN ? companyIdQ : user.companyId;
    return this.vendorsService.findAll(cid, { page, limit, search, type });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Get details of a specific vendor' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vendorsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Update vendor details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vendorsService.update(id, dto, user.companyId, user.role);
  }
}
