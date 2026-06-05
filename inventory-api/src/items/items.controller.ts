import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ItemsService } from './items.service';
import { s3Storage, memoryStorage, uploadCompressedToS3 } from '../storage/s3.storage';
import {
  CreateItemDto,
  UpdateItemDto,
  AssignItemDto,
  AssignBulkDto,
  RepairItemDto,
  DisposeItemDto,
  ReturnFromRepairDto,
  ReportLostDto,
  UpdateEmployeeDto,
  ChangeStatusDto,
} from './dto/item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { SkipAudit } from '../common/decorators/skip-audit.decorator';
import { ItemStatus, UserRole, AdminPermission } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';
import { ForbiddenException } from '@nestjs/common';



@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) { }

  // --- CRUD ---

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_ITEMS)
  create(@Body() dto: CreateItemDto, @CurrentUser() user: JwtPayload) {
    const callerCompanyId = user?.role === UserRole.SUPER_ADMIN ? undefined : user?.companyId;
    return this.itemsService.create(dto, user.sub, callerCompanyId);
  }

  @Get('preview-barcode')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_ITEMS, AdminPermission.CREATE_ITEMS)
  previewBarcode(
    @Query('companyId') companyId: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.itemsService.previewBarcode(companyId, categoryId);
  }

  @Get('check-serial')
  @SkipAudit()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  checkSerial(
    @Query('sn') sn: string,
    @Query('excludeId', new ParseUUIDPipe({ optional: true, version: '4' })) excludeId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const callerCompanyId = user?.role === UserRole.SUPER_ADMIN ? undefined : user?.companyId;
    return this.itemsService.checkSerialExists(sn, excludeId, callerCompanyId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_ITEMS)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: ItemStatus,
    @Query('categoryId') categoryId?: string,
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isWorking') isWorking?: string,
    @Query('needsRepair') needsRepair?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.itemsService.findAll({ page, limit, search, status, categoryId, companyId, departmentId, isWorking, needsRepair, assignedTo });
  }

  @Get('employees/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_EMPLOYEES, AdminPermission.REQUEST_TRANSFERS)
  getEmployeeGroupsSummary(
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const callerCompanyId = user?.role === UserRole.SUPER_ADMIN ? companyId : (companyId || user?.companyId);
    return this.itemsService.getEmployeeGroupsSummary({ companyId: callerCompanyId, departmentId });
  }

  @Get('employees')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_EMPLOYEES, AdminPermission.REQUEST_TRANSFERS)
  getEmployeeGroups(
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeName') employeeName?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const callerCompanyId = user?.role === UserRole.SUPER_ADMIN ? companyId : (companyId || user?.companyId);
    return this.itemsService.getEmployeeGroups({ companyId: callerCompanyId, departmentId, employeeName });
  }

  @Get('warehouse/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_WAREHOUSE)
  getWarehouse(
    @Param('companyId') companyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('includeDisposed') includeDisposed?: string,
  ) {
    return this.itemsService.getWarehouseItems(companyId, { page, limit, search, includeDisposed });
  }

  @Get(':barcodeOrId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_ITEMS)
  findOne(@Param('barcodeOrId') barcodeOrId: string) {
    return this.itemsService.getTimeline(barcodeOrId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS)
  update(@Param('id') id: string, @Body() dto: UpdateItemDto, @CurrentUser() user: JwtPayload) {
    const callerCompanyId = user?.role === UserRole.SUPER_ADMIN ? undefined : user?.companyId;
    return this.itemsService.update(id, dto, user.sub, callerCompanyId);
  }

  // --- ACTIONS ---

  @Patch('employee/update')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS, AdminPermission.UPDATE_USERS)
  updateEmployee(@Body() dto: UpdateEmployeeDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.updateEmployeeName(dto.oldName, dto.newName, dto.newEmployeeId || null, user.sub);
  }

  @Post(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS, AdminPermission.CREATE_USERS)
  assign(@Param('id') id: string, @Body() dto: AssignItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.assign(id, dto, user.sub);
  }

  @Post('assign-bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS, AdminPermission.CREATE_USERS)
  assignBulk(@Body() dto: AssignBulkDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.assignBulk(dto, user.sub);
  }

  @Post(':id/unassign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS, AdminPermission.DELETE_USERS)
  unassign(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.itemsService.unassign(id, user.sub);
  }

  @Post(':id/repair')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_REPAIRS)
  repair(@Param('id') id: string, @Body() dto: RepairItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.markForRepair(id, dto, user.sub);
  }

  @Post(':id/return-from-repair')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_REPAIRS)
  returnFromRepair(@Param('id') id: string, @Body() dto: ReturnFromRepairDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.returnFromRepair(id, dto, user.sub);
  }

  @Post(':id/dispose')
  @Roles(UserRole.SUPER_ADMIN)
  dispose(@Param('id') id: string, @Body() dto: DisposeItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.dispose(id, dto, user.sub, `${user.email}`);
  }

  @Post(':id/change-status')
  @Roles(UserRole.SUPER_ADMIN)
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.changeStatus(id, dto, user.sub);
  }

  // Permanent delete of mistakenly-added assets. Gated by an EXPLICIT
  // permission check (no SUPER_ADMIN bypass) so it is usable only by accounts
  // granted PERMANENT_DELETE_ITEMS via the database. Not written to audit logs.
  @Delete(':id/permanent')
  @SkipAudit()
  permanentDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const perms: string[] = (user as any).permissions || [];
    if (!perms.includes(AdminPermission.PERMANENT_DELETE_ITEMS)) {
      throw new ForbiddenException('You do not have permission to permanently delete assets.');
    }
    return this.itemsService.permanentDelete(id, { sub: user.sub, email: user.email });
  }

  @Post(':id/lost')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  reportLost(@Param('id') id: string, @Body() dto: ReportLostDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.reportLost(id, dto.notes, user.sub);
  }

  @Post(':id/move-to-warehouse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS, AdminPermission.DELETE_USERS)
  moveToWarehouse(@Param('id') id: string, @Body() body: { notes?: string, companyId?: string }, @CurrentUser() user: JwtPayload) {
    return this.itemsService.moveToWarehouse(id, user.sub, body?.notes, body?.companyId);
  }

  // --- FILE UPLOADS ---

  @Post(':id/warranty')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS)
  @UseInterceptors(FileInterceptor('file', { storage: s3Storage('warranties') }))
  uploadWarranty(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 10 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.itemsService.addWarrantyCard(id, (file as any).location);
  }

  @Post(':id/invoice')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS)
  @UseInterceptors(FileInterceptor('file', { storage: s3Storage('invoices') }))
  uploadInvoice(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 10 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.itemsService.addInvoice(id, (file as any).location);
  }

  @Post(':id/image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage, limits: { fileSize: 1024 * 1024 * 10 } }))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 10 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    const url = await uploadCompressedToS3(file.buffer, file.originalname, 'items');
    return this.itemsService.updateImage(id, url);
  }

  @Get(':id/qr-code')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_ITEMS)
  async getQrCode(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.itemsService.generateQrCode(id);
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(buffer);
  }
}
