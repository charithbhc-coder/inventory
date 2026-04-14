import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ItemCategoriesService } from './item-categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UserRole, AdminPermission } from '../common/enums';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('categories')
export class ItemCategoriesController {
  constructor(private readonly categoriesService: ItemCategoriesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_CATEGORIES)
  @ApiOperation({ summary: 'Create a new item category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_CATEGORIES, AdminPermission.MANAGE_CATEGORIES, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_COMPANIES, AdminPermission.VIEW_DEPARTMENTS)
  @ApiOperation({ summary: 'List all active categories' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.categoriesService.findAll({ page, limit, search });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_CATEGORIES, AdminPermission.MANAGE_CATEGORIES, AdminPermission.VIEW_ITEMS, AdminPermission.VIEW_COMPANIES, AdminPermission.VIEW_DEPARTMENTS)
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_CATEGORIES)
  @ApiOperation({ summary: 'Update a category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.MANAGE_CATEGORIES)
  @ApiOperation({ summary: 'Deactivate a category (soft delete)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
