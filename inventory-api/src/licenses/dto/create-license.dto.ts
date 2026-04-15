import {
  IsString,
  IsOptional,
  IsDateString,
  IsEmail,
  IsInt,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { LicenseStatus } from '../entities/license.entity';
import { Type } from 'class-transformer';

export class CreateLicenseDto {
  
  @IsString()
  @MaxLength(255)
  softwareName: string;

  
  @IsString()
  @MaxLength(255)
  vendor: string;

  
  @IsOptional()
  @IsString()
  @MaxLength(500)
  licenseKey?: string;

  
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  
  @IsDateString()
  expiryDate: string;

  






  
  @IsOptional()
  @IsEnum(LicenseStatus)
  status?: LicenseStatus;

  
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  
  @IsOptional()
  @IsString()
  notes?: string;
}
