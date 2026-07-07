import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { RemindersService } from './reminders.service';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Controller('reminders')
@UseGuards(AuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.remindersService.list(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(user, dto);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user: RequestUser, @Param('id') reminderId: string) {
    return this.remindersService.complete(user, reminderId);
  }
}
