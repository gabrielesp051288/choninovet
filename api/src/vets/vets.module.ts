import { Module } from '@nestjs/common';
import { VetsController } from './vets.controller';
import { VetsService } from './vets.service';

@Module({
  controllers: [VetsController],
  providers: [VetsService],
})
export class VetsModule {}
