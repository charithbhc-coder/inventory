import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsUUID, IsBoolean, IsDateString, IsArray, IsIn } from 'class-validator';
import { ItemCondition, ItemStatus, DisposalMethod } from '../../common/enums';
import { Type } from 'class-transformer';

// Statuses that can be set via the manual "Change Status" action.
// DISPOSED and LOST are intentionally excluded — they have their own
// approval/recovery workflows and must not be set by a free status change.
export const MANUAL_STATUSES: ItemStatus[] = [
  ItemStatus.WAREHOUSE,
  ItemStatus.IN_USE,
  ItemStatus.IN_REPAIR,
  ItemStatus.SENT_TO_REPAIR,
  ItemStatus.IN_TRANSIT,
];

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
  departmentId?: string | null;

  @IsUUID()
  @IsOptional()
  parentItemId?: string | null;

  @IsUUID()
  @IsOptional()
  companyId?: string;

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

  @IsBoolean()
  @IsOptional()
  isCorrection?: boolean;
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

export class ChangeStatusDto {
  @IsIn(MANUAL_STATUSES, {
    message: 'Status must be one of: WAREHOUSE, IN_USE, IN_REPAIR, SENT_TO_REPAIR, IN_TRANSIT',
  })
  status: ItemStatus;
}

export class UpdateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  oldName: string;

  @IsString()
  @IsNotEmpty()
  newName: string;

  @IsString()
  @IsOptional()
  newEmployeeId?: string | null;
}
