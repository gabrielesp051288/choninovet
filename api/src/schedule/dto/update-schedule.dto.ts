import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type ScheduleScope = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY';

export class ScheduleSettingDto {
  @IsIn(['WEEKDAY', 'SATURDAY', 'SUNDAY'])
  scope: ScheduleScope;

  @IsBoolean()
  isEnabled: boolean;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;

  @IsInt()
  intervalMinutes: number;
}

export class UpdateScheduleDto {
  @ValidateNested({ each: true })
  @Type(() => ScheduleSettingDto)
  settings: ScheduleSettingDto[];
}
