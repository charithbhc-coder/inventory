import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UserRole, AdminPermission } from '../common/enums';
import { FileInterceptor } from '@nestjs/platform-express';
import { s3Storage } from '../storage/s3.storage';



@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_COMPANIES)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES)
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.companiesService.findAll({ page, limit, search });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_COMPANIES)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Post(':id/logo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_COMPANIES)
  @UseInterceptors(FileInterceptor('file', { storage: s3Storage('logos') }))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.companiesService.updateLogo(id, (file as any).location);
  }

  @Get('logo-proxy')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async proxyLogo(@Query('url') url: string, @Res() res: Response) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      res.status(404).send('Image not found');
    }
  }
}
