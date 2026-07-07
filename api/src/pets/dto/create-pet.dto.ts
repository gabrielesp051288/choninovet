import { PetSex } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePetDto {
  @IsString()
  name: string;

  @IsString()
  species: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsEnum(PetSex)
  sex?: PetSex;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
