import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ItemCategoriesService } from './item-categories.service';
import { CreateItemCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Item Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('item-categories')
export class ItemCategoriesController {
  constructor(private readonly categoriesService: ItemCategoriesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Create a new item category. SA can create global categories.' })
  create(
    @Body() dto: CreateItemCategoryDto,
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQ?: string,
  ) {
    const cid = user.role === UserRole.SUPER_ADMIN ? (companyIdQ || undefined) : user.companyId;
    return this.categoriesService.create(dto, cid, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'List Item Categories (Global + Company)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('companyId') companyIdQ?: string,
  ) {
    const cid = user.role === UserRole.SUPER_ADMIN ? companyIdQ : user.companyId;
    return this.categoriesService.findAll(cid as any, { page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of an Item Category' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.findOne(id, user.companyId as string);
  }
}
