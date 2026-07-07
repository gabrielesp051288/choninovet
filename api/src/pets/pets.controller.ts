import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetsService } from './pets.service';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Controller('pets')
@UseGuards(AuthGuard)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.petsService.list(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePetDto) {
    return this.petsService.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') petId: string) {
    return this.petsService.findOne(user, petId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') petId: string,
    @Body() dto: UpdatePetDto,
  ) {
    return this.petsService.update(user, petId, dto);
  }

  @Post(':id/vets/:vetProfileId')
  associateVet(
    @CurrentUser() user: RequestUser,
    @Param('id') petId: string,
    @Param('vetProfileId') vetProfileId: string,
  ) {
    return this.petsService.associateVet(user, petId, vetProfileId);
  }
}
