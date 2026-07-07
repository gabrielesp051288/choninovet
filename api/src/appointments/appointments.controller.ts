import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Controller('appointments')
@UseGuards(AuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.appointmentsService.list(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') appointmentId: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(user, appointmentId, dto);
  }
}
