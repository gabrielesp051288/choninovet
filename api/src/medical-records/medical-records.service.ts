import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByPet(user: RequestUser, petId: string) {
    await this.assertPetAccess(user, petId);

    const records = await this.prisma.medicalRecord.findMany({
      where: { petId },
      include: { appointment: { include: { pet: true, vet: true } }, vet: true },
      orderBy: { recordDate: 'desc' },
    });

    return this.hidePrivateNotesForNonVets(user, records);
  }

  async create(user: RequestUser, dto: CreateMedicalRecordDto) {
    if (user.role !== UserRole.VET) {
      throw new ForbiddenException('Solo veterinarios/as pueden crear registros medicos');
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

    await this.assertCompletedAppointment({
      appointmentId: dto.appointmentId,
      petId: dto.petId,
      vetProfileId: vetProfile.id,
    });

    return this.prisma.medicalRecord.create({
      data: {
        petId: dto.petId,
        vetProfileId: vetProfile.id,
        appointmentId: dto.appointmentId || undefined,
        type: dto.type,
        recordDate: new Date(dto.recordDate),
        title: dto.title,
        description: dto.description,
        consultationReason: this.cleanOptionalText(dto.consultationReason),
        diagnosis: this.cleanOptionalText(dto.diagnosis),
        treatment: this.cleanOptionalText(dto.treatment),
        medication: this.cleanOptionalText(dto.medication),
        weightKg: dto.weightKg,
        temperatureC: dto.temperatureC,
        ownerVisibleNotes: this.cleanOptionalText(dto.ownerVisibleNotes),
        privateNotes: this.cleanOptionalText(dto.privateNotes),
        nextCheckAt: dto.nextCheckAt ? new Date(dto.nextCheckAt) : undefined,
      },
      include: { appointment: { include: { pet: true, vet: true } }, pet: true, vet: true },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateMedicalRecordDto) {
    if (user.role !== UserRole.VET) {
      throw new ForbiddenException('Solo veterinarios/as pueden editar registros medicos');
    }

    const vetProfile = await this.getVetProfile(user.sub);
    const record = await this.prisma.medicalRecord.findFirst({
      where: {
        id,
        vetProfileId: vetProfile.id,
      },
      select: { id: true, petId: true },
    });

    if (!record) {
      throw new NotFoundException('Registro medico no encontrado');
    }

    await this.assertCompletedAppointment({
      appointmentId: dto.appointmentId ?? undefined,
      petId: record.petId,
      vetProfileId: vetProfile.id,
    });

    return this.prisma.medicalRecord.update({
      where: { id },
      data: {
        appointmentId:
          dto.appointmentId === undefined ? undefined : dto.appointmentId || null,
        type: dto.type,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        consultationReason: this.cleanNullableText(dto.consultationReason),
        diagnosis: this.cleanNullableText(dto.diagnosis),
        treatment: this.cleanNullableText(dto.treatment),
        medication: this.cleanNullableText(dto.medication),
        weightKg: dto.weightKg,
        temperatureC: dto.temperatureC,
        ownerVisibleNotes: this.cleanNullableText(dto.ownerVisibleNotes),
        privateNotes: this.cleanNullableText(dto.privateNotes),
        nextCheckAt:
          dto.nextCheckAt === undefined
            ? undefined
            : dto.nextCheckAt
              ? new Date(dto.nextCheckAt)
              : null,
      },
      include: { appointment: { include: { pet: true, vet: true } }, pet: true, vet: true },
    });
  }

  private async assertCompletedAppointment({
    appointmentId,
    petId,
    vetProfileId,
  }: {
    appointmentId?: string;
    petId: string;
    vetProfileId: string;
  }) {
    if (!appointmentId) {
      return;
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        petId,
        vetProfileId,
        status: AppointmentStatus.COMPLETED,
      },
      select: { id: true },
    });

    if (!appointment) {
      throw new ForbiddenException(
        'El turno vinculado debe estar completado y pertenecer a esta mascota y veterinario/a',
      );
    }
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

  private cleanOptionalText(value?: string) {
    return value?.trim() || undefined;
  }

  private cleanNullableText(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    return value?.trim() || null;
  }

  private hidePrivateNotesForNonVets<
    T extends {
      privateNotes: string | null;
    },
  >(user: RequestUser, records: T[]) {
    if (user.role === UserRole.VET) {
      return records;
    }

    return records.map((record) => ({
      ...record,
      privateNotes: null,
    }));
  }
}
