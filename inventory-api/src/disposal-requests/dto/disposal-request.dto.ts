import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  DisposalCondition,
  DisposalFinalDecision,
  DisposalMethod,
  DisposalRequestStatus,
  DisposalReviewDecision,
} from '../../common/enums';

export class CreateDisposalRequestDto {
  @IsUUID()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  disposalReason: string;

  @IsEnum(DisposalCondition)
  disposalCondition: DisposalCondition;

  @IsString()
  @IsNotEmpty()
  technicalEvaluation: string;

  @IsEnum(DisposalMethod)
  proposedMethod: DisposalMethod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidencePhotoUrls?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class L1ReviewDto {
  @IsEnum(DisposalReviewDecision)
  decision: DisposalReviewDecision;

  @ValidateIf((o) => o.decision === DisposalReviewDecision.REJECTED)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  notes?: string;
}

export class DataSecurityChecklistDto {
  @IsBoolean()
  businessDataBacked: boolean;

  @IsBoolean()
  companyDataErased: boolean;

  @IsBoolean()
  storageFormatted: boolean;

  @IsBoolean()
  userAccountsRemoved: boolean;

  @IsBoolean()
  removedFromDomain: boolean;

  @IsBoolean()
  physicalDestructionDone: boolean;
}

export class L2ApproveDto {
  @IsEnum(DisposalFinalDecision)
  decision: DisposalFinalDecision;

  @ValidateIf((o) => o.decision === DisposalFinalDecision.REJECTED)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  notes?: string;

  @ValidateIf((o) => o.decision === DisposalFinalDecision.APPROVED)
  @IsObject()
  @ValidateNested()
  @Type(() => DataSecurityChecklistDto)
  dataSecurityChecklist?: DataSecurityChecklistDto;
}

export class DisposalRequestQueryDto {
  @IsEnum(DisposalRequestStatus)
  @IsOptional()
  status?: DisposalRequestStatus;

  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsUUID()
  @IsOptional()
  itemId?: string;
}
