import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UploadMedicalAttachmentDto } from './dto/upload-medical-attachment.dto';
import { MedicalAttachmentsService } from './medical-attachments.service';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Controller('medical-attachments')
@UseGuards(AuthGuard)
export class MedicalAttachmentsController {
  constructor(private readonly medicalAttachmentsService: MedicalAttachmentsService) {}

  @Get('pet/:petId')
  listByPet(@CurrentUser() user: RequestUser, @Param('petId') petId: string) {
    return this.medicalAttachmentsService.listByPet(user, petId);
  }

  @Post('pet/:petId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: RequestUser,
    @Param('petId') petId: string,
    @Body() dto: UploadMedicalAttachmentDto,
    @UploadedFile() file: any,
  ) {
    return this.medicalAttachmentsService.upload(user, petId, dto, file);
  }

  @Get(':id/download')
  download(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    return this.medicalAttachmentsService.download(user, id, response);
  }
}
