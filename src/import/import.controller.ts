import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Excel file for validation and preview' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['departments', 'users', 'categories', 'inventory'] },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'departments' | 'users' | 'categories' | 'inventory',
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!type) throw new BadRequestException('Type is required');
    return this.importService.validateAndPreview(file.buffer, type, user.companyId || '');
  }

  @Post('confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Confirm and process bulk import' })
  async confirmImport(
    @Body('data') data: any[],
    @Body('type') type: 'departments' | 'users' | 'categories' | 'inventory',
    @CurrentUser() user: JwtPayload,
  ) {
    if (!data || !Array.isArray(data)) throw new BadRequestException('Data is required and must be an array');
    if (!type) throw new BadRequestException('Type is required');
    return this.importService.processImport(data, type, user.companyId || '', user.sub);
  }
}
