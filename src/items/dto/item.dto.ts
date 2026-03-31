import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsUUID, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ItemCondition, ItemStatus } from '../../common/enums';

export class CreateItemDto {
  // Can be used if someone manually creates a single item outside warehouse flow
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ enum: ItemCondition, default: ItemCondition.NEW })
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  purchasePrice?: number;
}

export class ReceiveItemsDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  unitCost?: number;
}

export class BulkReceiveItemDetail {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkReceiveItemsDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [BulkReceiveItemDetail] })
  @IsArray()
  items: BulkReceiveItemDetail[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  unitCost?: number;
}

export class UpdateItemStatusDto {
  @ApiProperty({ enum: ItemStatus })
  @IsEnum(ItemStatus)
  status: ItemStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
  
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;
}

export class DistributeItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReportFaultDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  faultDescription: string;
}
