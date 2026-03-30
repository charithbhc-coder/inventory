import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '../entities/category-custom-field.entity';

export class CreateCustomFieldDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  fieldName: string;

  @ApiProperty()
  @IsString()
  fieldKey: string;

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
