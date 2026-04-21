import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsUUID, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ItemCondition, ItemStatus, DisposalMethod } from '../../common/enums';
import { Type } from 'class-transformer';

export class CreateItemDto {
  
  @IsString()
  @IsNotEmpty()
  name: string;

  
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  
  @IsString()
  @IsOptional()
  serialNumber?: string;

  
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  
  @IsString()
  @IsOptional()
  imageUrl?: string;

  
  @IsOptional()
  purchasePrice?: number | string;

  
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  
  @IsString()
  @IsOptional()
  purchasedFrom?: string;

  
  @IsDateString()
  @IsOptional()
  warrantyExpiresAt?: string;

  
  @IsString()
  @IsOptional()
  remarks?: string;

  
  @IsUUID()
  @IsOptional()
  parentItemId?: string;
}

export class UpdateItemDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  
  @IsString()
  @IsOptional()
  serialNumber?: string;

  
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  
  @IsString()
  @IsOptional()
  imageUrl?: string;

  
  @IsOptional()
  purchasePrice?: number | string;

  
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  
  @IsString()
  @IsOptional()
  purchasedFrom?: string;

  
  @IsDateString()
  @IsOptional()
  warrantyExpiresAt?: string;

  
  @IsString()
  @IsOptional()
  remarks?: string;

  
  @IsBoolean()
  @IsOptional()
  isWorking?: boolean;

  
  @IsUUID()
  @IsOptional()
  parentItemId?: string | null;

  @IsString()
  @IsOptional()
  assignedToName?: string;

  @IsString()
  @IsOptional()
  assignedToEmployeeId?: string;
}

export class AssignItemDto {
  
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  
  @IsString()
  @IsOptional()
  assignedToName?: string;

  
  @IsString()
  @IsOptional()
  assignedToEmployeeId?: string;

  
  @IsString()
  @IsOptional()
  location?: string;

  
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RepairItemDto {
  
  @IsString()
  @IsOptional()
  repairVendorName?: string;

  
  @IsString()
  @IsNotEmpty()
  repairNotes: string;

  
  @IsBoolean()
  @IsOptional()
  sentToRepair?: boolean; // true = sent out, false = just needs repair
}

export class DisposeItemDto {
  
  @IsString()
  @IsNotEmpty()
  disposalReason: string;

  
  @IsEnum(DisposalMethod)
  disposalMethod: DisposalMethod;

  
  @IsString()
  @IsOptional()
  disposalNotes?: string;
}

export class ReturnFromRepairDto {
  
  @IsString()
  @IsOptional()
  repairNotes?: string;

  
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;
}

export class AssignBulkDto extends AssignItemDto {
  
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  itemIds: string[];
}

export class ReportLostDto {
  
  @IsString()
  @IsNotEmpty()
  notes: string;
}
