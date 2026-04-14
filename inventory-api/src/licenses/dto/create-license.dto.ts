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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LicenseStatus } from '../entities/license.entity';
import { Type } from 'class-transformer';

export class CreateLicenseDto {
  @ApiProperty({ example: 'AWS Business Support' })
  @IsString()
  @MaxLength(255)
  softwareName: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  @IsString()
  @MaxLength(255)
  vendor: string;

  @ApiPropertyOptional({ example: 'XXXX-YYYY-ZZZZ-1234' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  licenseKey?: string;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ example: 50, description: 'Number of users/devices covered' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ enum: LicenseStatus })
  @IsOptional()
  @IsEnum(LicenseStatus)
  status?: LicenseStatus;

  @ApiPropertyOptional({ example: 'it@company.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'Security' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'Covers main office + satellite branch' })
  @IsOptional()
  @IsString()
  notes?: string;
}
