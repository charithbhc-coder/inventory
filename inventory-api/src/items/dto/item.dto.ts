import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsUUID, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ItemCondition, ItemStatus, DisposalMethod } from '../../common/enums';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @ApiProperty({ example: 'Dell Latitude 5540' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ enum: ItemCondition, default: ItemCondition.NEW, required: false })
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  purchasePrice?: number | string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  purchasedFrom?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  warrantyExpiresAt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false, description: 'Link this asset as a component inside another asset (e.g. RAM inside a Laptop)' })
  @IsUUID()
  @IsOptional()
  parentItemId?: string;
}

export class UpdateItemDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ enum: ItemCondition, required: false })
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  purchasePrice?: number | string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  purchasedFrom?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  warrantyExpiresAt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isWorking?: boolean;

  @ApiProperty({ required: false, description: 'Link this asset as a component inside another asset' })
  @IsUUID()
  @IsOptional()
  parentItemId?: string | null;
}

export class AssignItemDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ required: false, example: 'John Silva' })
  @IsString()
  @IsOptional()
  assignedToName?: string;

  @ApiProperty({ required: false, example: 'EMP-0042' })
  @IsString()
  @IsOptional()
  assignedToEmployeeId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RepairItemDto {
  @ApiProperty({ required: false, example: 'ABC Repair Shop' })
  @IsString()
  @IsOptional()
  repairVendorName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  repairNotes: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  sentToRepair?: boolean; // true = sent out, false = just needs repair
}

export class DisposeItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  disposalReason: string;

  @ApiProperty({ enum: DisposalMethod })
  @IsEnum(DisposalMethod)
  disposalMethod: DisposalMethod;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  disposalNotes?: string;
}

export class ReturnFromRepairDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  repairNotes?: string;

  @ApiProperty({ enum: ItemCondition, required: false })
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;
}

export class AssignBulkDto extends AssignItemDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  itemIds: string[];
}

export class ReportLostDto {
  @ApiProperty({ example: 'Lost during field assignment' })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
