import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';
import { GatePassStatus } from '../../common/enums';

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

export class RejectGatePassDto {
  @IsString()
  @IsNotEmpty()
  rejectionNotes: string;
}

export class GatePassQueryDto {
  @IsEnum(GatePassStatus)
  @IsOptional()
  status?: GatePassStatus;
}
