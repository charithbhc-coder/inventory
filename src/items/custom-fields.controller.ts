import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto, SetItemCustomValuesDto } from './dto/custom-field.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post('definitions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Create a new custom field definition for a category' })
  async createField(@Body() dto: CreateCustomFieldDto, @CurrentUser() user: JwtPayload) {
    // If Super Admin, allow creating global fields (categoryId present, but companyId = null)
    // In this API, we decide: if Super Admin creates it, it's global.
    const cid = user.role === UserRole.SUPER_ADMIN ? null : (user.companyId || '');
    return this.customFieldsService.createField(dto, cid);
  }

  @Get('definitions/:categoryId')
  @ApiOperation({ summary: 'Get all custom field definitions for a specific category' })
  async getFields(@Param('categoryId') categoryId: string, @CurrentUser() user: JwtPayload) {
    return this.customFieldsService.findFieldsByCategory(categoryId, user.companyId || '');
  }

  @Post('values/:itemId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.DEPT_ADMIN)
  @ApiOperation({ summary: 'Set or update custom field values for a specific item' })
  async setValues(@Param('itemId') itemId: string, @Body() dto: SetItemCustomValuesDto, @CurrentUser() user: JwtPayload) {
    return this.customFieldsService.setItemValues(itemId, dto, user.sub);
  }

  @Get('values/:itemId')
  @ApiOperation({ summary: 'Get custom field values for a specific item' })
  async getValues(@Param('itemId') itemId: string) {
    return this.customFieldsService.getItemValues(itemId);
  }
}
