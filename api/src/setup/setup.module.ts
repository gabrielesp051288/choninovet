import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SetupController } from './setup.controller';
import { SetupGuard } from './setup.guard';
import { SetupService } from './setup.service';

@Module({
  imports: [AuthModule],
  controllers: [SetupController],
  providers: [SetupService, SetupGuard],
})
export class SetupModule {}
