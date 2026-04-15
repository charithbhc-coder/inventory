import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepartmentDto {
  
  @IsString()
  @IsNotEmpty()
  name: string;

  
  @IsString()
  @IsNotEmpty()
  code: string;

  
  @IsString()
  @IsOptional()
  location?: string;
}

export class UpdateDepartmentDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsString()
  @IsOptional()
  location?: string;

  
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
