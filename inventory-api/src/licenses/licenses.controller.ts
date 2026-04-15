import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LicenseStatus } from './entities/license.entity';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AdminPermission } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';





@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  @Permissions(AdminPermission.CREATE_LICENSES)
  create(
    @Body() createLicenseDto: CreateLicenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.licensesService.create(createLicenseDto, userId);
  }

  @Get()
  @Permissions(AdminPermission.VIEW_LICENSES)
  findAll(
    @Query('status') status?: LicenseStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.licensesService.findAll(
      status,
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 15,
    );
  }

  @Get(':id')
  @Permissions(AdminPermission.VIEW_LICENSES)
  findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Patch(':id')
  @Permissions(AdminPermission.UPDATE_LICENSES)
  update(
    @Param('id') id: string, 
    @Body() updateLicenseDto: UpdateLicenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.licensesService.update(id, updateLicenseDto, userId);
  }

  @Delete(':id')
  @Permissions(AdminPermission.DELETE_LICENSES)
  remove(@Param('id') id: string) {
    return this.licensesService.remove(id);
  }
}
