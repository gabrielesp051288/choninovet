import { MedicalRecordType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateMedicalRecordDto {
  @IsOptional()
  @IsEnum(MedicalRecordType)
  type?: MedicalRecordType;

  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  nextCheckAt?: string | null;
}
