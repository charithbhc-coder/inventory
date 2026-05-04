import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateGatePassDto {
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  authorizedBy?: string;
}

export class AppendToGatePassDto {
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];
}

export class ReturnGatePassDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
