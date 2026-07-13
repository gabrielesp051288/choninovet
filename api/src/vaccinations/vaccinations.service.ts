import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MedicalRecordType, UserRole } from '@prisma/client';
import { ExtensionsService } from '../extensions/extensions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVaccinationRecordDto } from './dto/create-vaccination-record.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extensionsService: ExtensionsService,
  ) {}

  async listByPet(user: RequestUser, petId: string) {
    await this.extensionsService.assertActiveExtension('vaccination-plan', 'vaccination-plan');
    await this.assertPetAccess(user, petId);

    return this.prisma.vaccinationRecord.findMany({
      where: { petId },
      include: { vet: true },
      orderBy: [{ appliedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(user: RequestUser, dto: CreateVaccinationRecordDto) {
    await this.extensionsService.assertActiveExtension('vaccination-plan', 'vaccination-plan');

    if (user.role !== UserRole.VET) {
      throw new ForbiddenException('Solo veterinarios/as pueden cargar vacunas');
    }

    const vetProfile = await this.getVetProfile(user.sub);
    await this.assertVetPetAccess(vetProfile.id, dto.petId);

    const vaccineName = dto.vaccineName.trim();
    const brand = this.cleanOptionalText(dto.brand);
    const batchNumber = this.cleanOptionalText(dto.batchNumber);
    const notes = this.cleanOptionalText(dto.notes);
    const appliedAt = new Date(dto.appliedAt);
    const nextDueAt = dto.nextDueAt ? new Date(dto.nextDueAt) : undefined;

    const [vaccinationRecord] = await this.prisma.$transaction([
      this.prisma.vaccinationRecord.create({
        data: {
          petId: dto.petId,
          vetProfileId: vetProfile.id,
          vaccineName,
          brand,
          batchNumber,
          appliedAt,
          nextDueAt,
          notes,
        },
        include: { vet: true },
      }),
      this.prisma.medicalRecord.create({
        data: {
          petId: dto.petId,
          vetProfileId: vetProfile.id,
          type: MedicalRecordType.VACCINE,
          recordDate: appliedAt,
          title: `Vacuna: ${vaccineName}`,
          description: this.buildMedicalRecordDescription({
            vaccineName,
            brand,
            batchNumber,
          }),
          medication: this.buildMedicationText({ vaccineName, brand, batchNumber }),
          ownerVisibleNotes: notes,
          nextCheckAt: nextDueAt,
        },
      }),
    ]);

    return vaccinationRecord;
  }

  private async assertPetAccess(user: RequestUser, petId: string) {
    if (user.role === UserRole.ADMIN) {
      const pet = await this.prisma.pet.findUnique({ where: { id: petId }, select: { id: true } });

      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      return;
    }

    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);
      const pet = await this.prisma.pet.findFirst({
        where: { id: petId, ownerProfileId: ownerProfile.id },
        select: { id: true },
      });

      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      return;
    }

    const vetProfile = await this.getVetProfile(user.sub);
    await this.assertVetPetAccess(vetProfile.id, petId);
  }

  private async assertVetPetAccess(vetProfileId: string, petId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: petId,
        vets: {
          some: { vetProfileId },
        },
      },
      select: { id: true },
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada o no asociada al veterinario/a');
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

  private cleanOptionalText(value?: string) {
    return value?.trim() || undefined;
  }

  private buildMedicalRecordDescription({
    batchNumber,
    brand,
    vaccineName,
  }: {
    batchNumber?: string;
    brand?: string;
    vaccineName: string;
  }) {
    const details = [
      `Aplicacion de vacuna ${vaccineName}.`,
      brand ? `Marca: ${brand}.` : null,
      batchNumber ? `Lote: ${batchNumber}.` : null,
    ].filter(Boolean);

    return details.join(' ');
  }

  private buildMedicationText({
    batchNumber,
    brand,
    vaccineName,
  }: {
    batchNumber?: string;
    brand?: string;
    vaccineName: string;
  }) {
    return [
      vaccineName,
      brand ? `Marca: ${brand}` : null,
      batchNumber ? `Lote: ${batchNumber}` : null,
    ]
      .filter(Boolean)
      .join(' - ');
  }
}
