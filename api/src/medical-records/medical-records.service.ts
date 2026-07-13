import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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

    const createdRecord = await this.prisma.medicalRecord.create({
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

    await this.auditService.log({
      action: 'MEDICAL_RECORD_CREATED',
      actorUserId: user.sub,
      entityId: createdRecord.id,
      entityName: createdRecord.title,
      entityType: 'MEDICAL_RECORD',
      metadata: {
        appointmentId: createdRecord.appointmentId,
        petId: createdRecord.petId,
        petName: createdRecord.pet.name,
        recordDate: createdRecord.recordDate.toISOString(),
        type: createdRecord.type,
        vetProfileId: createdRecord.vetProfileId,
        vetName: createdRecord.vet.clinicName,
      },
      summary: `Creo registro medico ${createdRecord.title} para ${createdRecord.pet.name}`,
    });

    return createdRecord;
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
      include: { pet: true, vet: true },
    });

    if (!record) {
      throw new NotFoundException('Registro medico no encontrado');
    }

    await this.assertCompletedAppointment({
      appointmentId: dto.appointmentId ?? undefined,
      petId: record.petId,
      vetProfileId: vetProfile.id,
    });

    const updatedRecord = await this.prisma.medicalRecord.update({
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

    const changedFields = this.getChangedFields(record, updatedRecord);

    if (changedFields.length > 0) {
      await this.auditService.log({
        action: 'MEDICAL_RECORD_UPDATED',
        actorUserId: user.sub,
        entityId: updatedRecord.id,
        entityName: updatedRecord.title,
        entityType: 'MEDICAL_RECORD',
        metadata: {
          appointmentId: updatedRecord.appointmentId,
          changedFields,
          petId: updatedRecord.petId,
          petName: updatedRecord.pet.name,
          previousTitle: record.title,
          recordDate: updatedRecord.recordDate.toISOString(),
          type: updatedRecord.type,
          vetProfileId: updatedRecord.vetProfileId,
          vetName: updatedRecord.vet.clinicName,
        },
        summary: `Edito registro medico ${updatedRecord.title} para ${updatedRecord.pet.name}`,
      });
    }

    return updatedRecord;
  }

  private getChangedFields(
    previousRecord: {
      appointmentId: string | null;
      consultationReason: string | null;
      description: string;
      diagnosis: string | null;
      medication: string | null;
      nextCheckAt: Date | null;
      ownerVisibleNotes: string | null;
      privateNotes: string | null;
      recordDate: Date;
      temperatureC: Prisma.Decimal | null;
      title: string;
      treatment: string | null;
      type: string;
      weightKg: Prisma.Decimal | null;
    },
    nextRecord: {
      appointmentId: string | null;
      consultationReason: string | null;
      description: string;
      diagnosis: string | null;
      medication: string | null;
      nextCheckAt: Date | null;
      ownerVisibleNotes: string | null;
      privateNotes: string | null;
      recordDate: Date;
      temperatureC: Prisma.Decimal | null;
      title: string;
      treatment: string | null;
      type: string;
      weightKg: Prisma.Decimal | null;
    },
  ) {
    const comparisons: Array<[string, unknown, unknown]> = [
      ['appointmentId', previousRecord.appointmentId, nextRecord.appointmentId],
      ['type', previousRecord.type, nextRecord.type],
      ['recordDate', previousRecord.recordDate.toISOString(), nextRecord.recordDate.toISOString()],
      ['title', previousRecord.title, nextRecord.title],
      ['description', previousRecord.description, nextRecord.description],
      ['consultationReason', previousRecord.consultationReason, nextRecord.consultationReason],
      ['diagnosis', previousRecord.diagnosis, nextRecord.diagnosis],
      ['treatment', previousRecord.treatment, nextRecord.treatment],
      ['medication', previousRecord.medication, nextRecord.medication],
      ['weightKg', previousRecord.weightKg?.toString() ?? null, nextRecord.weightKg?.toString() ?? null],
      [
        'temperatureC',
        previousRecord.temperatureC?.toString() ?? null,
        nextRecord.temperatureC?.toString() ?? null,
      ],
      ['ownerVisibleNotes', previousRecord.ownerVisibleNotes, nextRecord.ownerVisibleNotes],
      ['privateNotes', previousRecord.privateNotes, nextRecord.privateNotes],
      [
        'nextCheckAt',
        previousRecord.nextCheckAt?.toISOString() ?? null,
        nextRecord.nextCheckAt?.toISOString() ?? null,
      ],
    ];

    return comparisons
      .filter(([, previousValue, nextValue]) => previousValue !== nextValue)
      .map(([field]) => field);
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
