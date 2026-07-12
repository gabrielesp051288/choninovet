import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MedicalAttachmentType, UserRole } from '@prisma/client';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UploadMedicalAttachmentDto } from './dto/upload-medical-attachment.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

type UploadedAttachment = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

const allowedAttachmentMimeTypes = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['application/pdf', '.pdf'],
]);

@Injectable()
export class MedicalAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByPet(user: RequestUser, petId: string) {
    await this.assertPetAccess(user, petId);

    return this.prisma.medicalAttachment.findMany({
      where: { petId },
      include: {
        medicalRecord: {
          select: {
            id: true,
            title: true,
            recordDate: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    user: RequestUser,
    petId: string,
    dto: UploadMedicalAttachmentDto,
    file?: UploadedAttachment,
  ) {
    if (user.role !== UserRole.VET && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo veterinarios/as pueden subir adjuntos clinicos');
    }

    if (!file?.buffer || !file.mimetype) {
      throw new BadRequestException('Debes enviar un archivo');
    }

    const extension = allowedAttachmentMimeTypes.get(file.mimetype);

    if (!extension) {
      throw new BadRequestException('Formato no permitido. Usa imagen JPG/PNG/WEBP o PDF');
    }

    if (file.size && file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('El archivo no puede superar 10 MB');
    }

    await this.assertPetUploadAccess(user, petId);
    await this.assertRecordBelongsToPet(petId, dto.medicalRecordId);

    const uploadsDir = join(process.cwd(), 'uploads', 'medical-attachments');
    const storedFileName = `${petId}-${randomUUID()}${extension}`;
    const filePath = join(uploadsDir, storedFileName);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(filePath, file.buffer);

    return this.prisma.medicalAttachment.create({
      data: {
        petId,
        medicalRecordId: dto.medicalRecordId || undefined,
        uploadedByUserId: user.sub,
        type: dto.type,
        originalName: file.originalname || `adjunto${extension}`,
        storedFileName,
        mimeType: file.mimetype,
        sizeBytes: file.size ?? file.buffer.byteLength,
      },
      include: {
        medicalRecord: {
          select: {
            id: true,
            title: true,
            recordDate: true,
            type: true,
          },
        },
      },
    });
  }

  async download(user: RequestUser, id: string, response: Response) {
    const attachment = await this.prisma.medicalAttachment.findUnique({
      where: { id },
      include: { pet: true },
    });

    if (!attachment) {
      throw new NotFoundException('Adjunto no encontrado');
    }

    await this.assertPetAccess(user, attachment.petId);

    if (!/^[a-zA-Z0-9._-]+$/.test(attachment.storedFileName)) {
      throw new NotFoundException('Adjunto no encontrado');
    }

    const filePath = join(
      process.cwd(),
      'uploads',
      'medical-attachments',
      attachment.storedFileName,
    );

    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
    );

    return response.sendFile(filePath);
  }

  private async assertPetUploadAccess(user: RequestUser, petId: string) {
    if (user.role === UserRole.ADMIN) {
      await this.assertPetAccess(user, petId);
      return;
    }

    const vetProfile = await this.getVetProfile(user.sub);
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: petId,
        vets: {
          some: { vetProfileId: vetProfile.id },
        },
      },
      select: { id: true },
    });

    if (!pet) {
      throw new NotFoundException('Mascota asociada no encontrada');
    }
  }

  private async assertPetAccess(user: RequestUser, petId: string) {
    if (user.role === UserRole.ADMIN) {
      const pet = await this.prisma.pet.findUnique({ where: { id: petId } });

      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      return;
    }

    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);
      const pet = await this.prisma.pet.findFirst({
        where: { id: petId, ownerProfileId: ownerProfile.id },
      });

      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      return;
    }

    const vetProfile = await this.getVetProfile(user.sub);
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: petId,
        vets: {
          some: { vetProfileId: vetProfile.id },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }
  }

  private async assertRecordBelongsToPet(petId: string, medicalRecordId?: string) {
    if (!medicalRecordId) {
      return;
    }

    const record = await this.prisma.medicalRecord.findFirst({
      where: {
        id: medicalRecordId,
        petId,
      },
      select: { id: true },
    });

    if (!record) {
      throw new BadRequestException('El registro medico no pertenece a esta mascota');
    }
  }

  private async getOwnerProfile(userId: string) {
    const ownerProfile = await this.prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile) {
      throw new ForbiddenException('Perfil de propietario requerido');
    }

    return ownerProfile;
  }

  private async getVetProfile(userId: string) {
    const vetProfile = await this.prisma.vetProfile.findUnique({
      where: { userId },
    });

    if (!vetProfile) {
      throw new ForbiddenException('Perfil veterinario/a requerido');
    }

    return vetProfile;
  }
}
