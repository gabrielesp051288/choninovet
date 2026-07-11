import { IsIn, IsObject, IsOptional } from 'class-validator';

const extensionStatuses = ['ACTIVE', 'INACTIVE', 'NEEDS_CONFIGURATION'] as const;

export class UpdateExtensionDto {
  @IsOptional()
  @IsIn(extensionStatuses)
  status?: 'ACTIVE' | 'INACTIVE' | 'NEEDS_CONFIGURATION';

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
