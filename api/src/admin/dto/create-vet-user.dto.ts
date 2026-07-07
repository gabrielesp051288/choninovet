import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateVetUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  clinicName: string;

  @IsOptional()
  @IsString()
  managerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
