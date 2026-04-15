import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
} from 'class-validator';
import { UserRole, AdminPermission } from '../../common/enums';

export class CreateUserDto {
  
  @IsEmail()
  email: string;

  
  @IsString()
  @IsNotEmpty()
  firstName: string;

  
  @IsString()
  @IsNotEmpty()
  lastName: string;

  
  @IsString()
  @IsNotEmpty()
  role: string;

  
  @IsUUID()
  @IsOptional()
  companyId?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;

  
  @IsArray()
  @IsOptional()
  permissions?: string[];
}

export class UpdateUserDto {
  
  @IsString()
  @IsOptional()
  firstName?: string;

  
  @IsString()
  @IsOptional()
  lastName?: string;

  
  @IsString()
  @IsOptional()
  role?: string;

  
  @IsUUID()
  @IsOptional()
  companyId?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;

  
  @IsArray()
  @IsOptional()
  permissions?: string[];
}

export class UpdatePermissionsDto {
  
  @IsArray()
  @IsNotEmpty()
  permissions: string[];
}
