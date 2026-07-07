import { ReminderType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  petId: string;

  @IsEnum(ReminderType)
  type: ReminderType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueAt: string;
}
