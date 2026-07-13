import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateVaccinationRecordDto {
  @IsString()
  petId: string;

  @IsString()
  @MaxLength(160)
  vaccineName: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batchNumber?: string;

  @IsDateString()
  appliedAt: string;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
