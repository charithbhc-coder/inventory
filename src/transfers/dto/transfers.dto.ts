import { IsString, IsNotEmpty, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransferType, TransferStatus } from '../../common/enums';

export class InitiateTransferDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: TransferType })
  @IsEnum(TransferType)
  transferType: TransferType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  fromDepartmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fromLocation?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  toDepartmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  toLocation?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  currentHolderUserId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  handoffNotes?: string;
}

export class UpdateTransferLocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentLocation: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  handoffNotes?: string;
}

export class AcknowledgeTransferDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
