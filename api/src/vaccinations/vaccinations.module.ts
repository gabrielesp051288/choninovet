import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExtensionsModule } from '../extensions/extensions.module';
import { VaccinationsController } from './vaccinations.controller';
import { VaccinationsService } from './vaccinations.service';

@Module({
  imports: [AuthModule, ExtensionsModule],
  controllers: [VaccinationsController],
  providers: [VaccinationsService],
})
export class VaccinationsModule {}
