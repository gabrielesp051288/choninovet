import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PetPhotosController } from './pet-photos.controller';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';

@Module({
  imports: [AuthModule],
  controllers: [PetsController, PetPhotosController],
  providers: [PetsService],
})
export class PetsModule {}
