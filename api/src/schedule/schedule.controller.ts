import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ScheduleService } from './schedule.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('schedule')
@UseGuards(AuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  getSchedule() {
    return this.scheduleService.getSchedule();
  }

  @Patch()
  updateSchedule(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.updateSchedule(user.role, dto);
  }
}
