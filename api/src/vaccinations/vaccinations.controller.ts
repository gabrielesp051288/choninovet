import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateVaccinationRecordDto } from './dto/create-vaccination-record.dto';
import { VaccinationsService } from './vaccinations.service';

@Controller('vaccinations')
@UseGuards(AuthGuard)
export class VaccinationsController {
  constructor(private readonly vaccinationsService: VaccinationsService) {}

  @Get('pet/:petId')
  listByPet(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('petId') petId: string,
  ) {
    return this.vaccinationsService.listByPet(user, petId);
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() dto: CreateVaccinationRecordDto,
  ) {
    return this.vaccinationsService.create(user, dto);
  }
}
