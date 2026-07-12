import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Controller('medical-records')
@UseGuards(AuthGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get('pet/:petId')
  listByPet(@CurrentUser() user: RequestUser, @Param('petId') petId: string) {
    return this.medicalRecordsService.listByPet(user, petId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMedicalRecordDto) {
    return this.medicalRecordsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.update(user, id, dto);
  }
}
