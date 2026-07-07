import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(user: RequestUser) {
    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);

      return this.prisma.appointment.findMany({
        where: {
          pet: { ownerProfileId: ownerProfile.id },
        },
        include: { pet: true, vet: true },
        orderBy: { scheduledAt: 'asc' },
      });
    }

    if (user.role === UserRole.VET) {
      const vetProfile = await this.getVetProfile(user.sub);

      return this.prisma.appointment.findMany({
        where: { vetProfileId: vetProfile.id },
        include: { pet: true, vet: true },
        orderBy: { scheduledAt: 'asc' },
      });
    }

    return this.prisma.appointment.findMany({
      include: { pet: true, vet: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(user: RequestUser, dto: CreateAppointmentDto) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can request appointments');
    }

    const ownerProfile = await this.getOwnerProfile(user.sub);

    const pet = await this.prisma.pet.findFirst({
      where: {
        id: dto.petId,
        ownerProfileId: ownerProfile.id,
        vets: {
          some: { vetProfileId: dto.vetProfileId },
        },
      },
      select: { id: true },
    });

    if (!pet) {
      throw new NotFoundException('Associated pet not found');
    }

    return this.prisma.appointment.create({
      data: {
        petId: dto.petId,
        vetProfileId: dto.vetProfileId,
        requestedByUserId: user.sub,
        scheduledAt: new Date(dto.scheduledAt),
        reason: dto.reason,
        status: AppointmentStatus.REQUESTED,
      },
      include: { pet: true, vet: true },
    });
  }

  async updateStatus(
    user: RequestUser,
    appointmentId: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    if (user.role !== UserRole.VET && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only vets can update appointment status');
    }

    const where =
      user.role === UserRole.VET
        ? {
            id: appointmentId,
            vetProfileId: (await this.getVetProfile(user.sub)).id,
          }
        : { id: appointmentId };

    const appointment = await this.prisma.appointment.findFirst({
      where,
      include: { pet: true, vet: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: dto.status,
        cancellationReason: dto.cancellationReason,
      },
      include: { pet: true, vet: true },
    });

    if (
      appointment.status !== updatedAppointment.status ||
      appointment.cancellationReason !== updatedAppointment.cancellationReason
    ) {
      await this.auditService.log({
        action: 'APPOINTMENT_STATUS_CHANGED',
        actorUserId: user.sub,
        entityId: updatedAppointment.id,
        entityName: updatedAppointment.pet.name,
        entityType: 'APPOINTMENT',
        metadata: {
          nextStatus: updatedAppointment.status,
          petName: updatedAppointment.pet.name,
          previousStatus: appointment.status,
          vetName: updatedAppointment.vet.clinicName,
        },
        summary: `Cambió turno de ${updatedAppointment.pet.name} en ${updatedAppointment.vet.clinicName} de ${appointment.status} a ${updatedAppointment.status}`,
      });
    }

    return updatedAppointment;
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
