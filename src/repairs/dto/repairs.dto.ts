import { IsString, IsNotEmpty, IsNumber, IsEnum, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Urgency, RepairStatus, RepairOutcome, DisposalReason, DisposalMethod } from '../../common/enums';

export class CreateRepairJobDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  faultDescription: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  faultPhotos?: string[];

  @ApiPropertyOptional({ enum: Urgency, default: Urgency.NORMAL })
  @IsEnum(Urgency)
  @IsOptional()
  priority?: Urgency;
}

export class ApproveRepairJobDto {
  @ApiProperty()
  @IsUUID()
  assignedRepairHandlerId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  vendorId?: string;
  
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  estimatedRepairCost?: number;
}

export class UpdateRepairStatusDto {
  @ApiProperty({ enum: RepairStatus })
  @IsEnum(RepairStatus)
  status: RepairStatus;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  updateNote: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  actualRepairCost?: number;

  @ApiPropertyOptional({ enum: RepairOutcome })
  @IsEnum(RepairOutcome)
  @IsOptional()
  outcome?: RepairOutcome;
}

export class CreateDisposalRequestDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: DisposalReason })
  @IsEnum(DisposalReason)
  reason: DisposalReason;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  repairJobId?: string;
}

export class ProcessDisposalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ enum: DisposalMethod })
  @IsEnum(DisposalMethod)
  @IsOptional()
  disposalMethod?: DisposalMethod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  disposalNotes?: string;
}
