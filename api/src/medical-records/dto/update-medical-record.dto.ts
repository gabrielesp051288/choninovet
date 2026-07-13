import { MedicalRecordType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateMedicalRecordDto {
  @IsOptional()
  @IsEnum(MedicalRecordType)
  type?: MedicalRecordType;

  @IsOptional()
  @IsString()
  appointmentId?: string | null;

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
  @IsString()
  consultationReason?: string | null;

  @IsOptional()
  @IsString()
  diagnosis?: string | null;

  @IsOptional()
  @IsString()
  treatment?: string | null;

  @IsOptional()
  @IsString()
  medication?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  temperatureC?: number | null;

  @IsOptional()
  @IsString()
  ownerVisibleNotes?: string | null;

  @IsOptional()
  @IsString()
  privateNotes?: string | null;

  @IsOptional()
  @IsDateString()
  nextCheckAt?: string | null;
}
