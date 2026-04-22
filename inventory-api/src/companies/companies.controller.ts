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



@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.CREATE_COMPANIES)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES)
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.companiesService.findAll({ page, limit, search });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.VIEW_COMPANIES)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.UPDATE_COMPANIES)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
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

  // PUBLIC endpoint for proxying logos (no auth needed for logo display)
  @Get('logo-proxy')
  async proxyLogo(@Query('url') url: string, @Res() res: Response) {
    if (!url) return res.status(400).send('URL is required');
    
    try {
      const protocol = url.startsWith('https') ? require('https') : require('http');
      
      protocol.get(url, {
        headers: {
          'User-Agent': 'KTMG-Inventory-Proxy/1.0',
        }
      }, (proxyRes: any) => {
        if (proxyRes.statusCode >= 400) {
          console.error(`Proxy fetch failed for ${url}: ${proxyRes.statusCode}`);
          return res.status(proxyRes.statusCode).send('Failed to fetch from source');
        }

        const contentType = proxyRes.headers['content-type'];
        if (contentType) res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        proxyRes.pipe(res);
      }).on('error', (err: any) => {
        console.error(`Proxy connection error for ${url}:`, err);
        res.status(500).send('Internal Server Error while proxying image');
      });
    } catch (err) {
      console.error(`Proxy setup error for ${url}:`, err);
      res.status(500).send('Internal Server Error');
    }
  }
}
