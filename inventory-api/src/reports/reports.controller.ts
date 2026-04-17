import { Controller, Get, Post, Patch, Delete, Res, UseGuards, Query, Body, Param } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UserRole, AdminPermission } from '../common/enums';
import { ReportFilterDto } from './dto/report-filter.dto';
import { SendReportEmailDto } from './dto/send-email.dto';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';
import { UsersService } from '../users/users.service';



@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly usersService: UsersService,
  ) {}

  private async getUserContext(userId: string): Promise<string> {
    try {
      const user = await this.usersService.findOne(userId);
      return `${user.firstName} ${user.lastName} (${(user.role || '').replace(/_/g, ' ')})`;
    } catch {
      return 'System User';
    }
  }

  // ─── MASTER ASSET REGISTER ────────────────────────────────────────
  @Get('assets/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportAssetsExcel(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportDetailedAssetExcel(filters, context);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Asset_Register.xlsx');
    res.send(buffer);
  }

  @Get('assets/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportAssetsPdf(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportDetailedAssetPdf(filters, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Asset_Register.pdf');
    res.send(buffer);
  }

  // ─── EXECUTIVE SUMMARY ────────────────────────────────────────────
  @Get('summary/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportSummaryExcel(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportSummaryExcel(filters, context);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Inventory_Summary.xlsx');
    res.send(buffer);
  }

  @Get('summary/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportSummaryPdf(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportSummaryPdf(filters, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Inventory_Summary.pdf');
    res.send(buffer);
  }

  // ─── DEPARTMENT REPORT ────────────────────────────────────────────
  @Get('department/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportDepartmentExcel(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportDepartmentExcel(filters, context);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Department_Report.xlsx');
    res.send(buffer);
  }

  @Get('department/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportDepartmentPdf(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportDepartmentPdf(filters, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Department_Report.pdf');
    res.send(buffer);
  }

  // ─── ACTIVITY LOG ─────────────────────────────────────────────────
  @Get('activity/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportActivityExcel(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportActivityExcel(filters, context);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Activity_Log.xlsx');
    res.send(buffer);
  }

  @Get('activity/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportActivityPdf(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportActivityPdf(filters, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Activity_Log.pdf');
    res.send(buffer);
  }

  // ─── REPAIR HISTORY ───────────────────────────────────────────────
  @Get('repair/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportRepairExcel(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportRepairExcel(filters, context);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Repair_History.xlsx');
    res.send(buffer);
  }

  @Get('repair/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportRepairPdf(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportRepairPdf(filters, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Repair_History.pdf');
    res.send(buffer);
  }

  // ─── SOFTWARE LICENSES ──────────────────────────────────────────
  @Get('licenses/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportLicensesExcel(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportLicensesExcel(filters, context);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Software_Licenses.xlsx');
    res.send(buffer);
  }

  @Get('licenses/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EXPORT_DATA, AdminPermission.VIEW_REPORTS)
  async exportLicensesPdf(@Query() filters: ReportFilterDto, @Res() res: Response, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    const buffer = await this.reportsService.exportLicensesPdf(filters, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Software_Licenses.pdf');
    res.send(buffer);
  }

  // ─── EMAIL DISPATCH ───────────────────────────────────────────────
  @Post('send-email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS, AdminPermission.EXPORT_DATA)
  async sendEmail(@Body() dto: SendReportEmailDto, @CurrentUser() jwt: JwtPayload) {
    const context = await this.getUserContext(jwt.sub);
    return this.reportsService.sendEmailDispatch(dto, context);
  }

  // ─── SCHEDULED REPORTS CRUD ───────────────────────────────────────
  @Get('schedules')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  getSchedules() {
    return this.reportsService.findAllSchedules();
  }

  @Post('schedules')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  createSchedule(@Body() dto: CreateScheduledReportDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.createSchedule(dto, user.sub);
  }

  @Patch('schedules/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduledReportDto) {
    return this.reportsService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_REPORTS)
  deleteSchedule(@Param('id') id: string, @Body() body: any) {
    return this.reportsService.deleteSchedule(id);
  }
}
