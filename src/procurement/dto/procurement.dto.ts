import { IsString, IsNotEmpty, IsNumber, IsEnum, IsUUID, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Urgency, PRItemSource } from '../../common/enums';

export class CreatePurchaseRequestItemDto {
  @ApiProperty({ example: 'Ergonomic Keyboard' })
  @IsString()
  @IsNotEmpty()
  requestedItemName: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  estimatedUnitCost?: number;
}

export class CreatePurchaseRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiPropertyOptional({ enum: Urgency, default: Urgency.NORMAL })
  @IsEnum(Urgency)
  @IsOptional()
  urgency?: Urgency;

  @ApiProperty({ type: [CreatePurchaseRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequestItemDto)
  items: CreatePurchaseRequestItemDto[];

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}

export class SourcePrItemDto {
  @ApiProperty()
  @IsEnum(PRItemSource)
  source: PRItemSource;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  estimatedUnitCost?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  vendorId?: string;
}

export class RejectPrDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

export class OrderItemDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  purchaseRequestItemId?: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsNumber()
  quantityOrdered: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  unitCost?: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class ReceiveOrderDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsNumber()
  quantityReceived: number;

  @ApiProperty()
  @IsNumber()
  unitCost: number;

  @ApiProperty()
  @IsString()
  itemName: string;
}
