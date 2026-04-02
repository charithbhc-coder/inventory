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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ItemsService } from './items.service';
import {
  CreateItemDto,
  UpdateItemDto,
  AssignItemDto,
  RepairItemDto,
  DisposeItemDto,
  ReturnFromRepairDto,
} from './dto/item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ItemStatus, UserRole, AdminPermission } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // --- CRUD ---

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ADD_ITEMS)
  @ApiOperation({ summary: 'Add a new item to inventory (auto-generates barcode)' })
  create(@Body() dto: CreateItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all items with filters' })
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
  @ApiOperation({ summary: 'View company warehouse — unassigned and disposed items' })
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
  @ApiOperation({ summary: 'Get item details with full event timeline' })
  findOne(@Param('barcodeOrId') barcodeOrId: string) {
    return this.itemsService.getTimeline(barcodeOrId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EDIT_ITEMS)
  @ApiOperation({ summary: 'Update item details' })
  update(@Param('id') id: string, @Body() dto: UpdateItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.update(id, dto, user.sub);
  }

  // --- ACTIONS ---

  @Post(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS)
  @ApiOperation({ summary: 'Assign item to department/person' })
  assign(@Param('id') id: string, @Body() dto: AssignItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.assign(id, dto, user.sub);
  }

  @Post(':id/unassign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS)
  @ApiOperation({ summary: 'Unassign item from person (return to department/warehouse)' })
  unassign(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.itemsService.unassign(id, user.sub);
  }

  @Post(':id/repair')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_REPAIRS)
  @ApiOperation({ summary: 'Mark item for repair or send to repair vendor' })
  repair(@Param('id') id: string, @Body() dto: RepairItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.markForRepair(id, dto, user.sub);
  }

  @Post(':id/return-from-repair')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_REPAIRS)
  @ApiOperation({ summary: 'Return item from repair' })
  returnFromRepair(@Param('id') id: string, @Body() dto: ReturnFromRepairDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.returnFromRepair(id, dto, user.sub);
  }

  @Post(':id/dispose')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_DISPOSALS)
  @ApiOperation({ summary: 'Dispose item (requires reason and disposal method)' })
  dispose(@Param('id') id: string, @Body() dto: DisposeItemDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.dispose(id, dto, user.sub, `${user.email}`);
  }

  @Post(':id/move-to-warehouse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.ASSIGN_ITEMS)
  @ApiOperation({ summary: 'Return item to company warehouse' })
  moveToWarehouse(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.itemsService.moveToWarehouse(id, user.sub);
  }

  // --- FILE UPLOADS ---

  @Post(':id/warranty')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.EDIT_ITEMS)
  @ApiOperation({ summary: 'Upload warranty card for an item' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/warranties',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
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
  @Permissions(AdminPermission.EDIT_ITEMS)
  @ApiOperation({ summary: 'Upload invoice for an item' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
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
}
