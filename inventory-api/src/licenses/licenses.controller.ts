import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LicenseStatus } from './entities/license.entity';

@ApiTags('Licenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new software license' })
  create(@Body() createLicenseDto: CreateLicenseDto) {
    return this.licensesService.create(createLicenseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all software licenses (paginated)' })
  @ApiQuery({ name: 'status', enum: LicenseStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
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
  @ApiOperation({ summary: 'Get a software license by ID' })
  findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a software license' })
  update(@Param('id') id: string, @Body() updateLicenseDto: UpdateLicenseDto) {
    return this.licensesService.update(id, updateLicenseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a software license' })
  remove(@Param('id') id: string) {
    return this.licensesService.remove(id);
  }
}
