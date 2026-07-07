import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByPet(user: RequestUser, petId: string) {
    await this.assertPetAccess(user, petId);

    return this.prisma.medicalRecord.findMany({
      where: { petId },
      include: { vet: true },
      orderBy: { recordDate: 'desc' },
    });
  }

  async create(user: RequestUser, dto: CreateMedicalRecordDto) {
    if (user.role !== UserRole.VET) {
      throw new ForbiddenException('Only vets can create medical records');
    }

    const vetProfile = await this.getVetProfile(user.sub);

    const pet = await this.prisma.pet.findFirst({
      where: {
        id: dto.petId,
        vets: {
          some: { vetProfileId: vetProfile.id },
        },
      },
      select: { id: true },
    });

    if (!pet) {
      throw new NotFoundException('Associated pet not found');
    }

    return this.prisma.medicalRecord.create({
      data: {
        petId: dto.petId,
        vetProfileId: vetProfile.id,
        type: dto.type,
        recordDate: new Date(dto.recordDate),
        title: dto.title,
        description: dto.description,
        nextCheckAt: dto.nextCheckAt ? new Date(dto.nextCheckAt) : undefined,
      },
      include: { pet: true, vet: true },
    });
  }

  private async assertPetAccess(user: RequestUser, petId: string) {
    if (user.role === UserRole.ADMIN) {
      const pet = await this.prisma.pet.findUnique({ where: { id: petId } });

      if (!pet) {
        throw new NotFoundException('Pet not found');
      }

      return;
    }

    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);
      const pet = await this.prisma.pet.findFirst({
        where: { id: petId, ownerProfileId: ownerProfile.id },
      });

      if (!pet) {
        throw new NotFoundException('Pet not found');
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
      throw new NotFoundException('Pet not found');
    }
  }

  private async getOwnerProfile(userId: string) {
    const ownerProfile = await this.prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile) {
      throw new ForbiddenException('Owner profile required');
    }

    return ownerProfile;
  }

  private async getVetProfile(userId: string) {
    const vetProfile = await this.prisma.vetProfile.findUnique({
      where: { userId },
    });

    if (!vetProfile) {
      throw new ForbiddenException('Vet profile required');
    }

    return vetProfile;
  }
}
