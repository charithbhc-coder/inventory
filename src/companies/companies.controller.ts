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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new company' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Post(':id/admins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a Company Admin for a specific company' })
  async createCompanyAdmin(
    @Param('id') id: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Force role and company ID
    dto.role = UserRole.COMPANY_ADMIN;
    dto.companyId = id;
    
    // Ensure company exists first
    await this.companiesService.findOne(id);
    return this.usersService.create(dto, user.sub, user.role, id);
  }

  @Post(':id/users')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a general user (STAFF, etc.) for a specific company' })
  async createCompanyUser(
    @Param('id') id: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Force company ID from URL for safety
    dto.companyId = id;
    
    // Ensure company exists first
    await this.companiesService.findOne(id);
    return this.usersService.create(dto, user.sub, user.role, id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all companies (Super Admin only)' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.companiesService.findAll({ page, limit, search });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get details of a specific company' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN) // Depending on requirements, CA may be able to update their own corp details
  @ApiOperation({ summary: 'Update company details' })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Post(':id/logo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Upload a new company logo image' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new (require('@nestjs/common').FileTypeValidator)({
            fileType: /(jpg|jpeg|png|webp)$/i,
            fallbackToMimetype: true,
          }),
        )
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 }) // 5MB
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.companiesService.updateLogo(id, file.filename);
  }
}
