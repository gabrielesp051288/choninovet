import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleSettingDto, UpdateScheduleDto } from './dto/update-schedule.dto';

type ScheduleRow = {
  scope: 'WEEKDAY' | 'SATURDAY' | 'SUNDAY';
  is_enabled: boolean | number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
};

const defaultSettings: ScheduleSettingDto[] = [
  {
    scope: 'WEEKDAY',
    isEnabled: true,
    startTime: '08:00',
    endTime: '20:00',
    intervalMinutes: 30,
  },
  {
    scope: 'SATURDAY',
    isEnabled: true,
    startTime: '09:00',
    endTime: '13:00',
    intervalMinutes: 30,
  },
  {
    scope: 'SUNDAY',
    isEnabled: false,
    startTime: '09:00',
    endTime: '13:00',
    intervalMinutes: 30,
  },
];

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchedule() {
    await this.ensureDefaults();

    const rows = await this.prisma.$queryRaw<ScheduleRow[]>`
      SELECT scope, is_enabled, start_time, end_time, interval_minutes
      FROM schedule_settings
      ORDER BY FIELD(scope, 'WEEKDAY', 'SATURDAY', 'SUNDAY')
    `;

    return rows.map((row) => ({
      scope: row.scope,
      isEnabled: Boolean(row.is_enabled),
      startTime: row.start_time,
      endTime: row.end_time,
      intervalMinutes: row.interval_minutes,
    }));
  }

  async updateSchedule(role: UserRole, dto: UpdateScheduleDto) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Se requiere rol administrador');
    }

    this.validateSettings(dto.settings);

    for (const setting of dto.settings) {
      await this.prisma.$executeRaw`
        INSERT INTO schedule_settings (scope, is_enabled, start_time, end_time, interval_minutes)
        VALUES (${setting.scope}, ${setting.isEnabled}, ${setting.startTime}, ${setting.endTime}, ${setting.intervalMinutes})
        ON DUPLICATE KEY UPDATE
          is_enabled = VALUES(is_enabled),
          start_time = VALUES(start_time),
          end_time = VALUES(end_time),
          interval_minutes = VALUES(interval_minutes)
      `;
    }

    return this.getSchedule();
  }

  private async ensureDefaults() {
    for (const setting of defaultSettings) {
      await this.prisma.$executeRaw`
        INSERT INTO schedule_settings (scope, is_enabled, start_time, end_time, interval_minutes)
        VALUES (${setting.scope}, ${setting.isEnabled}, ${setting.startTime}, ${setting.endTime}, ${setting.intervalMinutes})
        ON DUPLICATE KEY UPDATE scope = VALUES(scope)
      `;
    }
  }

  private validateSettings(settings: ScheduleSettingDto[]) {
    const scopes = new Set(settings.map((setting) => setting.scope));

    for (const scope of ['WEEKDAY', 'SATURDAY', 'SUNDAY']) {
      if (!scopes.has(scope as ScheduleSettingDto['scope'])) {
        throw new BadRequestException(`Falta configuracion para ${scope}`);
      }
    }

    for (const setting of settings) {
      if (setting.intervalMinutes < 15 || setting.intervalMinutes > 120) {
        throw new BadRequestException('El intervalo debe estar entre 15 y 120 minutos');
      }

      if (timeToMinutes(setting.startTime) >= timeToMinutes(setting.endTime)) {
        throw new BadRequestException('La hora de inicio debe ser menor a la hora de fin');
      }
    }
  }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);

  return hours * 60 + minutes;
}
