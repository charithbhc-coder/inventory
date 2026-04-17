import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateCompanyDto {
  
  @IsString()
  @IsNotEmpty()
  name: string;

  
  @IsString()
  @IsNotEmpty()
  code: string;

  
  @IsString()
  @IsOptional()
  address?: string;

  
  @IsEmail()
  @IsOptional()
  email?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;

}

export class UpdateCompanyDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  
  @IsString()
  @IsOptional()
  address?: string;

  
  @IsEmail()
  @IsOptional()
  email?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;

  
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
