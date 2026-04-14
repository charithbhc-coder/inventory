import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { FileFormat, ReportFrequency } from '../entities/scheduled-report.entity';
import { ReportFilterDto } from './report-filter.dto';

export class CreateScheduledReportDto {
  @IsString()
  @IsNotEmpty()
  reportType: string; // 'assets' | 'summary' | 'department' | 'activity' | 'repair'

  @IsArray()
  @IsEmail({}, { each: true })
  recipientEmails: string[];

  @IsEnum(ReportFrequency)
  frequency: ReportFrequency;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'timeOfDay must be in HH:MM format' })
  timeOfDay: string; // "09:00"

  @IsOptional()
  dayOfWeek?: number | null; // 0-6 for weekly

  @IsOptional()
  dayOfMonth?: number | null; // 1-31 for monthly

  @IsEnum(FileFormat)
  fileFormat: FileFormat;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  bodyMessage?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFilterDto)
  filters?: ReportFilterDto;
}

export class UpdateScheduledReportDto {
  @IsOptional()
  @IsString()
  reportType?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipientEmails?: string[];

  @IsOptional()
  @IsEnum(ReportFrequency)
  frequency?: ReportFrequency;

  @IsOptional()
  @IsString()
  timeOfDay?: string;

  @IsOptional()
  dayOfWeek?: number | null;

  @IsOptional()
  dayOfMonth?: number | null;

  @IsOptional()
  @IsEnum(FileFormat)
  fileFormat?: FileFormat;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  bodyMessage?: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFilterDto)
  filters?: ReportFilterDto;
}
