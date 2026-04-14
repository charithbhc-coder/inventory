import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportFilterDto } from './report-filter.dto';

export class SendReportEmailDto {
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  recipientEmails: string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  reportType?: string; // 'assets' | 'summary' | 'department' | 'activity' | 'repair' | null (no attachment)

  @IsOptional()
  @IsEnum(['PDF', 'EXCEL', 'BOTH'])
  fileFormat?: 'PDF' | 'EXCEL' | 'BOTH';

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFilterDto)
  filters?: ReportFilterDto;
}
