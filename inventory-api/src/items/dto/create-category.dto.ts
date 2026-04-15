import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  
  @IsString()
  @IsNotEmpty()
  name: string;

  
  @IsString()
  @IsNotEmpty()
  code: string;

  
  @IsString()
  @IsOptional()
  description?: string;

  
  @IsUUID()
  @IsOptional()
  parentCategoryId?: string;
}

export class UpdateCategoryDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsString()
  @IsOptional()
  description?: string;

  
  @IsUUID()
  @IsOptional()
  parentCategoryId?: string | null;
}
