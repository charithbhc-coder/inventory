import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ItemsService } from './items.service';
import {
  CreateItemDto,
  UpdateItemDto,
  AssignItemDto,
  AssignBulkDto,
  RepairItemDto,
  DisposeItemDto,
  ReturnFromRepairDto,
  ReportLostDto,
} from './dto/item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ItemStatus, UserRole, AdminPermission } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';



@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // --- CRUD ---

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_ITEMS)
  create(@Body() dto: CreateItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.create(dto, user.sub);
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
  ) {
    return this.itemsService.findAll({ page, limit, search, status, categoryId, companyId, departmentId, isWorking, needsRepair });
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
    return this.itemsService.update(id, dto, user.sub);
  }

  // --- ACTIONS ---

  @Post(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS)
  assign(@Param('id') id: string, @Body() dto: AssignItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.assign(id, dto, user.sub);
  }

  @Post('assign-bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS)
  assignBulk(@Body() dto: AssignBulkDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.assignBulk(dto, user.sub);
  }

  @Post(':id/unassign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_DISPOSALS)
  dispose(@Param('id') id: string, @Body() dto: DisposeItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.dispose(id, dto, user.sub, `${user.email}`);
  }

  @Post(':id/lost')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  reportLost(@Param('id') id: string, @Body() dto: ReportLostDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.reportLost(id, dto.notes, user.sub);
  }

  @Post(':id/move-to-warehouse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS)
  moveToWarehouse(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.itemsService.moveToWarehouse(id, user.sub);
  }

  // --- FILE UPLOADS ---

  @Post(':id/warranty')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/warranties',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname).toLowerCase()}`);
        },
      }),
    }),
  )
  uploadWarranty(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 10 }) // 10MB
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.itemsService.addWarrantyCard(id, file.filename);
  }

  @Post(':id/invoice')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/invoices',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadInvoice(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 10 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.itemsService.addInvoice(id, file.filename);
  }

  @Post(':id/image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_ITEMS)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/items',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 10 }) // 10MB
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.itemsService.updateImage(id, file.filename);
  }
}
