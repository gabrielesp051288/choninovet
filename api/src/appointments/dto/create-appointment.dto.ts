import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  petId: string;

  @IsString()
  vetProfileId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
