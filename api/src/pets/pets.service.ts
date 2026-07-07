import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);

      return this.prisma.pet.findMany({
        where: { ownerProfileId: ownerProfile.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (user.role === UserRole.VET) {
      const vetProfile = await this.getVetProfile(user.sub);

      return this.prisma.pet.findMany({
        where: {
          vets: {
            some: { vetProfileId: vetProfile.id },
          },
        },
        include: {
          owner: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.pet.findMany({
      include: {
        owner: true,
        vets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: RequestUser, dto: CreatePetDto) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can create pets');
    }

    const ownerProfile = await this.getOwnerProfile(user.sub);

    return this.prisma.pet.create({
      data: {
        ownerProfileId: ownerProfile.id,
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        sex: dto.sex,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        weightKg: dto.weightKg,
        notes: dto.notes,
      },
    });
  }

  async findOne(user: RequestUser, petId: string) {
    const pet = await this.findAccessiblePet(user, petId);

    return pet;
  }

  async update(user: RequestUser, petId: string, dto: UpdatePetDto) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only owners can update pets');
    }

    await this.findAccessiblePet(user, petId);

    return this.prisma.pet.update({
      where: { id: petId },
      data: {
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        sex: dto.sex,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        weightKg: dto.weightKg,
        notes: dto.notes,
      },
    });
  }

  async associateVet(user: RequestUser, petId: string, vetProfileId: string) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only owners can associate vets');
    }

    await this.findAccessiblePet(user, petId);

    const vetProfile = await this.prisma.vetProfile.findUnique({
      where: { id: vetProfileId },
      select: { id: true },
    });

    if (!vetProfile) {
      throw new NotFoundException('Vet profile not found');
    }

    return this.prisma.petVet.upsert({
      where: {
        petId_vetProfileId: {
          petId,
          vetProfileId,
        },
      },
      update: {},
      create: {
        petId,
        vetProfileId,
      },
    });
  }

  private async findAccessiblePet(user: RequestUser, petId: string) {
    if (user.role === UserRole.ADMIN) {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: { owner: true, vets: true, records: true },
      });

      if (!pet) {
        throw new NotFoundException('Pet not found');
      }

      return pet;
    }

    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);
      const pet = await this.prisma.pet.findFirst({
        where: { id: petId, ownerProfileId: ownerProfile.id },
        include: { owner: true, vets: true, records: true },
      });

      if (!pet) {
        throw new NotFoundException('Pet not found');
      }

      return pet;
    }

    const vetProfile = await this.getVetProfile(user.sub);
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: petId,
        vets: {
          some: { vetProfileId: vetProfile.id },
        },
      },
      include: { owner: true, vets: true, records: true },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    return pet;
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
