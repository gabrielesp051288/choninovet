import { MedicalRecordType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @IsDateString()
  nextCheckAt?: string;
}
