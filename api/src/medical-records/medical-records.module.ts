import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MedicalAttachmentsController } from './medical-attachments.controller';
import { MedicalAttachmentsService } from './medical-attachments.service';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  imports: [AuthModule],
  controllers: [MedicalRecordsController, MedicalAttachmentsController],
  providers: [MedicalRecordsService, MedicalAttachmentsService],
})
export class MedicalRecordsModule {}
