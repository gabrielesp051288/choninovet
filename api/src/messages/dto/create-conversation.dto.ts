import { IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  vetProfileId: string;

  @IsOptional()
  @IsString()
  petId?: string;
}
