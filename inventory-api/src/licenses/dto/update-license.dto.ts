import { CreateLicenseDto } from './create-license.dto';
import { PartialType } from "@nestjs/mapped-types";

export class UpdateLicenseDto extends PartialType(CreateLicenseDto) {}
