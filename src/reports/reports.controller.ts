import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UserRole, AdminPermission } from '../common/enums';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('global-asset-register/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA)
  @ApiOperation({ summary: 'Export Global Asset Register to Excel' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.reportsService.exportGlobalAssetRegisterExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Global_Asset_Register.xlsx');
    res.send(buffer);
  }

  @Get('global-asset-register/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA)
  @ApiOperation({ summary: 'Export Global Asset Register to PDF' })
  async exportPdf(@Res() res: Response) {
    const buffer = await this.reportsService.exportGlobalAssetRegisterPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Global_Asset_Register.pdf');
    res.send(buffer);
  }
}
