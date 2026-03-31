import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, IsInt, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '../entities/category-custom-field.entity';

export class CreateCustomFieldDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fieldName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fieldKey?: string;

  @ApiProperty({ description: 'Human readable label (e.g. Memory RAM)' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ description: 'Technical name/slug (e.g. ram_gb). No spaces.' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Helpful explanation for the user' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Ghost text in the input box' })
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dropdownOptions?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateCustomFieldValueDto {
  @ApiProperty()
  @IsString()
  fieldId: string;

  @ApiProperty()
  @IsString()
  value: string;
}

export class SetItemCustomValuesDto {
  @ApiProperty({ type: [UpdateCustomFieldValueDto] })
  @IsArray()
  values: UpdateCustomFieldValueDto[];
}
