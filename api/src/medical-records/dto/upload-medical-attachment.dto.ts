import { MedicalAttachmentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadMedicalAttachmentDto {
  @IsOptional()
  @IsString()
  medicalRecordId?: string;

  @IsEnum(MedicalAttachmentType)
  type: MedicalAttachmentType;
}
