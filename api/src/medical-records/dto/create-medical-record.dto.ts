import { MedicalRecordType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMedicalRecordDto {
  @IsString()
  petId: string;

  @IsEnum(MedicalRecordType)
  type: MedicalRecordType;

  @IsDateString()
  recordDate: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  consultationReason?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  medication?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  temperatureC?: number;

  @IsOptional()
  @IsString()
  ownerVisibleNotes?: string;

  @IsOptional()
  @IsString()
  privateNotes?: string;

  @IsOptional()
  @IsDateString()
  nextCheckAt?: string;
}
