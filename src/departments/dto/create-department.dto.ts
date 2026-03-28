import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Human Resources' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'HR' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ required: false, example: 'Floor 2, Building A' })
  @IsString()
  @IsOptional()
  location?: string;
}

export class UpdateDepartmentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
