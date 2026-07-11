import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, ExtensionStatus, Prisma, UserRole } from '@prisma/client';
import AdmZip from 'adm-zip';
import * as bcrypt from 'bcryptjs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVetUserDto } from './dto/create-vet-user.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

type UploadedExtensionPackage = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

type ExtensionManifest = {
  key: string;
  name: string;
  version?: string;
  description: string;
  category?: string;
  requiresExternalService?: boolean;
  entry?: Record<string, unknown>;
  permissions?: string[];
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getDashboard() {
    const [
      totalUsers,
      totalOwners,
      totalVets,
      totalPets,
      totalAppointments,
      pendingAppointments,
      pendingReminders,
      pendingOwnerAccounts,
      totalConversations,
      accountOwners,
      accountVets,
      accountAdmins,
      recentVets,
      recentOwners,
      recentPets,
      upcomingAppointments,
      recentReminders,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.ownerProfile.count(),
      this.prisma.vetProfile.count(),
      this.prisma.pet.count(),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({ where: { status: 'REQUESTED' } }),
      this.prisma.reminder.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({
        where: { role: UserRole.OWNER, status: AccountStatus.PENDING },
      }),
      this.prisma.conversation.count(),
      this.findAccountsByRole(UserRole.OWNER),
      this.findAccountsByRole(UserRole.VET),
      this.findAccountsByRole(UserRole.ADMIN),
      this.prisma.vetProfile.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              pets: true,
              appointments: true,
            },
          },
        },
      }),
      this.prisma.ownerProfile.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              pets: true,
            },
          },
        },
      }),
      this.prisma.pet.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: true,
          _count: {
            select: {
              vets: true,
              records: true,
              appointments: true,
            },
          },
        },
      }),
      this.prisma.appointment.findMany({
        take: 30,
        orderBy: { scheduledAt: 'asc' },
        include: {
          pet: true,
          vet: true,
        },
      }),
      this.prisma.reminder.findMany({
        take: 30,
        orderBy: { dueAt: 'asc' },
        include: {
          pet: true,
          vet: true,
        },
      }),
      this.prisma.auditLog.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      metrics: {
        totalUsers,
        totalOwners,
        totalVets,
        totalPets,
        totalAppointments,
        pendingAppointments,
        pendingReminders,
        pendingOwnerAccounts,
        totalConversations,
      },
      accounts: {
        owners: accountOwners,
        vets: accountVets,
        admins: accountAdmins,
      },
      recentVets,
      recentOwners,
      recentPets,
      upcomingAppointments,
      recentReminders,
      recentAuditLogs,
    };
  }

  async getExtensions() {
    return this.prisma.extension.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createVetUser(actorUserId: string, dto: CreateVetUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email ya registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: UserRole.VET,
        status: AccountStatus.ACTIVE,
        vetProfile: {
          create: {
            clinicName: dto.clinicName,
            managerName: dto.managerName,
            phone: dto.phone,
            address: dto.address,
            description: dto.description,
          },
        },
      },
      include: {
        vetProfile: true,
      },
    });

    await this.auditService.log({
      action: 'VET_CREATED',
      actorUserId,
      entityId: createdUser.vetProfile?.id,
      entityName: createdUser.vetProfile?.clinicName ?? dto.clinicName,
      entityType: 'VET',
      metadata: {
        email: createdUser.email,
        userId: createdUser.id,
      },
      summary: `Creó el veterinario/a ${createdUser.vetProfile?.clinicName ?? dto.clinicName}`,
    });

    return createdUser;
  }

  async getVetDetail(id: string) {
    const vet = await this.prisma.vetProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            status: true,
            createdAt: true,
          },
        },
        pets: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            pet: {
              include: {
                owner: true,
                _count: {
                  select: {
                    appointments: true,
                    records: true,
                    reminders: true,
                  },
                },
              },
            },
          },
        },
        appointments: {
          take: 20,
          orderBy: { scheduledAt: 'desc' },
          include: {
            pet: true,
          },
        },
        records: {
          take: 20,
          orderBy: { recordDate: 'desc' },
          include: {
            pet: true,
          },
        },
        reminders: {
          take: 20,
          orderBy: { dueAt: 'asc' },
          include: {
            pet: true,
          },
        },
        _count: {
          select: {
            pets: true,
            appointments: true,
            records: true,
            reminders: true,
            conversations: true,
          },
        },
      },
    });

    if (!vet) {
      throw new NotFoundException('Veterinario/a no encontrado');
    }

    return { type: 'vet', vet };
  }

  async getOwnerDetail(id: string) {
    const owner = await this.prisma.ownerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            status: true,
            createdAt: true,
          },
        },
        pets: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            vets: {
              include: {
                vet: true,
              },
            },
            appointments: {
              take: 10,
              orderBy: { scheduledAt: 'desc' },
              include: {
                vet: true,
              },
            },
            records: {
              take: 10,
              orderBy: { recordDate: 'desc' },
              include: {
                vet: true,
              },
            },
            reminders: {
              take: 10,
              orderBy: { dueAt: 'asc' },
              include: {
                vet: true,
              },
            },
            _count: {
              select: {
                vets: true,
                appointments: true,
                records: true,
                reminders: true,
              },
            },
          },
        },
        _count: {
          select: {
            pets: true,
          },
        },
      },
    });

    if (!owner) {
      throw new NotFoundException('Propietario no encontrado');
    }

    return { type: 'owner', owner };
  }

  async getPetDetail(id: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        owner: {
          include: {
            user: {
              select: {
                email: true,
                status: true,
              },
            },
          },
        },
        vets: {
          include: {
            vet: {
              include: {
                user: {
                  select: {
                    email: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        appointments: {
          take: 20,
          orderBy: { scheduledAt: 'desc' },
          include: {
            vet: true,
          },
        },
        records: {
          take: 20,
          orderBy: { recordDate: 'desc' },
          include: {
            vet: true,
          },
        },
        reminders: {
          take: 20,
          orderBy: { dueAt: 'asc' },
          include: {
            vet: true,
          },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    return { type: 'pet', pet };
  }

  async updateUserStatus(actorUserId: string, userId: string, dto: UpdateUserStatusDto) {
    const previousUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownerProfile: true,
        vetProfile: true,
      },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        ownerProfile: true,
        vetProfile: true,
      },
    });

    await this.auditService.log({
      action: 'USER_STATUS_CHANGED',
      actorUserId,
      entityId: updatedUser.id,
      entityName: accountAuditName(updatedUser),
      entityType: 'USER',
      metadata: {
        email: updatedUser.email,
        nextStatus: updatedUser.status,
        previousStatus: previousUser?.status,
        role: updatedUser.role,
      },
      summary: `Cambió estado de ${accountAuditName(updatedUser)} de ${
        previousUser?.status ?? 'SIN_DATO'
      } a ${updatedUser.status}`,
    });

    return updatedUser;
  }

  async uploadExtension(actorUserId: string, file?: UploadedExtensionPackage) {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException('Debes subir un archivo de extension');
    }

    if (file.size && file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('La extension no puede superar 10 MB');
    }

    const manifest = this.readExtensionManifest(file);
    this.validateExtensionManifest(manifest);

    const extensionKey = manifest.key.trim().toLowerCase();
    const existingExtension = await this.prisma.extension.findUnique({
      where: { key: extensionKey },
    });
    const uploadsDir = join(process.cwd(), 'uploads', 'extensions');
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    const packageFilename = `${extensionKey}-${randomUUID()}-${safeOriginalName}`;
    const packagePath = join(uploadsDir, packageFilename);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(packagePath, file.buffer);

    if (existingExtension?.packagePath) {
      await this.deleteExtensionPackage(existingExtension.packagePath);
    }

    const extension = await this.prisma.extension.upsert({
      where: { key: extensionKey },
      update: {
        name: manifest.name.trim(),
        version: manifest.version?.trim() || '1.0.0',
        description: manifest.description.trim(),
        category: manifest.category?.trim() || 'General',
        status: ExtensionStatus.INACTIVE,
        isInstalled: true,
        requiresExternalService: Boolean(manifest.requiresExternalService),
        packagePath,
        manifest: manifest as Prisma.InputJsonValue,
      },
      create: {
        key: extensionKey,
        name: manifest.name.trim(),
        version: manifest.version?.trim() || '1.0.0',
        description: manifest.description.trim(),
        category: manifest.category?.trim() || 'General',
        status: ExtensionStatus.INACTIVE,
        isInstalled: true,
        requiresExternalService: Boolean(manifest.requiresExternalService),
        packagePath,
        manifest: manifest as Prisma.InputJsonValue,
      },
    });

    await this.auditService.log({
      action: 'EXTENSION_UPLOADED',
      actorUserId,
      entityId: extension.key,
      entityName: extension.name,
      entityType: 'EXTENSION',
      metadata: {
        version: extension.version,
        previousStatus: existingExtension?.status,
        status: extension.status,
      },
      summary: `Subio extension ${extension.name} (${extension.version})`,
    });

    return extension;
  }

  async updateExtension(actorUserId: string, key: string, dto: UpdateExtensionDto) {
    const extension = await this.prisma.extension.findUnique({
      where: { key },
    });

    if (!extension) {
      throw new NotFoundException('Extension no encontrada');
    }

    const nextStatus = dto.status ?? extension.status;
    const updatedExtension = await this.prisma.extension.update({
      where: { key },
      data: {
        status: nextStatus,
        isInstalled: nextStatus !== ExtensionStatus.AVAILABLE,
        config: dto.config === undefined ? undefined : (dto.config as Prisma.InputJsonValue),
      },
    });

    await this.auditService.log({
      action: 'EXTENSION_UPDATED',
      actorUserId,
      entityId: updatedExtension.key,
      entityName: updatedExtension.name,
      entityType: 'EXTENSION',
      metadata: {
        nextStatus: updatedExtension.status,
        previousStatus: extension.status,
        requiresExternalService: updatedExtension.requiresExternalService,
      },
      summary: `Actualizo extension ${updatedExtension.name} de ${extension.status} a ${updatedExtension.status}`,
    });

    return updatedExtension;
  }

  assertAdmin(role: UserRole) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Se requiere rol administrador');
    }
  }

  private findAccountsByRole(role: UserRole) {
    return this.prisma.user.findMany({
      where: { role },
      take: 30,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        ownerProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            _count: {
              select: {
                pets: true,
              },
            },
          },
        },
        vetProfile: {
          select: {
            id: true,
            clinicName: true,
            managerName: true,
            phone: true,
          },
        },
      },
    });
  }

  private readExtensionManifest(file: UploadedExtensionPackage): ExtensionManifest {
    const originalName = file.originalname?.toLowerCase() ?? '';

    try {
      if (originalName.endsWith('.zip')) {
        const zip = new AdmZip(file.buffer);
        const manifestEntry =
          zip.getEntry('choninovet-extension.json') ?? zip.getEntry('manifest.json');

        if (!manifestEntry) {
          throw new BadRequestException(
            'El ZIP debe incluir choninovet-extension.json o manifest.json',
          );
        }

        return JSON.parse(manifestEntry.getData().toString('utf8')) as ExtensionManifest;
      }

      if (originalName.endsWith('.json')) {
        return JSON.parse(file.buffer.toString('utf8')) as ExtensionManifest;
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('No se pudo leer el manifiesto de la extension');
    }

    throw new BadRequestException('Formato no permitido. Usa .json o .zip');
  }

  private validateExtensionManifest(manifest: ExtensionManifest) {
    if (!manifest || typeof manifest !== 'object') {
      throw new BadRequestException('Manifiesto de extension invalido');
    }

    if (!manifest.key || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(manifest.key)) {
      throw new BadRequestException(
        'La extension necesita key valida: minusculas, numeros y guiones, 3 a 64 caracteres',
      );
    }

    if (!manifest.name?.trim() || !manifest.description?.trim()) {
      throw new BadRequestException('La extension necesita name y description');
    }
  }

  private async deleteExtensionPackage(packagePath: string) {
    try {
      await unlink(packagePath);
    } catch {
      return;
    }
  }
}

function accountAuditName(user: {
  email: string;
  ownerProfile?: { firstName: string; lastName: string } | null;
  vetProfile?: { clinicName: string } | null;
}) {
  if (user.ownerProfile) {
    return `${user.ownerProfile.firstName} ${user.ownerProfile.lastName}`;
  }

  if (user.vetProfile) {
    return user.vetProfile.clinicName;
  }

  return user.email;
}
