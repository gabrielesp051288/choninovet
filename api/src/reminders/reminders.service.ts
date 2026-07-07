import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReminderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);

      return this.prisma.reminder.findMany({
        where: {
          pet: { ownerProfileId: ownerProfile.id },
        },
        include: { pet: true, vet: true },
        orderBy: { dueAt: 'asc' },
      });
    }

    if (user.role === UserRole.VET) {
      const vetProfile = await this.getVetProfile(user.sub);

      return this.prisma.reminder.findMany({
        where: { vetProfileId: vetProfile.id },
        include: { pet: true, vet: true },
        orderBy: { dueAt: 'asc' },
      });
    }

    return this.prisma.reminder.findMany({
      include: { pet: true, vet: true },
      orderBy: { dueAt: 'asc' },
    });
  }

  async create(user: RequestUser, dto: CreateReminderDto) {
    if (user.role !== UserRole.VET) {
      throw new ForbiddenException('Only vets can create reminders');
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

    return this.prisma.reminder.create({
      data: {
        petId: dto.petId,
        vetProfileId: vetProfile.id,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueAt: new Date(dto.dueAt),
      },
      include: { pet: true, vet: true },
    });
  }

  async complete(user: RequestUser, reminderId: string) {
    const reminder = await this.findAccessibleReminder(user, reminderId);

    return this.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: ReminderStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: { pet: true, vet: true },
    });
  }

  private async findAccessibleReminder(user: RequestUser, reminderId: string) {
    if (user.role === UserRole.ADMIN) {
      const reminder = await this.prisma.reminder.findUnique({
        where: { id: reminderId },
      });

      if (!reminder) {
        throw new NotFoundException('Reminder not found');
      }

      return reminder;
    }

    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);
      const reminder = await this.prisma.reminder.findFirst({
        where: {
          id: reminderId,
          pet: { ownerProfileId: ownerProfile.id },
        },
      });

      if (!reminder) {
        throw new NotFoundException('Reminder not found');
      }

      return reminder;
    }

    const vetProfile = await this.getVetProfile(user.sub);
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        id: reminderId,
        vetProfileId: vetProfile.id,
      },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
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
