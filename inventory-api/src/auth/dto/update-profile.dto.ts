import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;
}
