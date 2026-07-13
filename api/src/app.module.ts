import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ExtensionsModule } from './extensions/extensions.module';
import { HealthModule } from './health/health.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { MessagesModule } from './messages/messages.module';
import { PetsModule } from './pets/pets.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemindersModule } from './reminders/reminders.module';
import { ScheduleModule } from './schedule/schedule.module';
import { SetupModule } from './setup/setup.module';
import { VaccinationsModule } from './vaccinations/vaccinations.module';
import { VetsModule } from './vets/vets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    ExtensionsModule,
    PetsModule,
    VetsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    RemindersModule,
    MessagesModule,
    ScheduleModule,
    SetupModule,
    VaccinationsModule,
  ],
})
export class AppModule {}
