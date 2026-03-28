import { IsString, IsNotEmpty, IsNumber, IsEnum, IsUUID, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Urgency } from '../../common/enums';

export class CreatePurchaseRequestDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiPropertyOptional({ enum: Urgency, default: Urgency.NORMAL })
  @IsEnum(Urgency)
  @IsOptional()
  urgency?: Urgency;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  estimatedUnitCost?: number;
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
  purchaseRequestId?: string;

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
