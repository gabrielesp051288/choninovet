import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VetsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.vetProfile.findMany({
      select: {
        id: true,
        clinicName: true,
        managerName: true,
        phone: true,
        address: true,
        description: true,
      },
      orderBy: { clinicName: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.vetProfile.findUnique({
      where: { id },
      select: {
        id: true,
        clinicName: true,
        managerName: true,
        phone: true,
        address: true,
        description: true,
      },
    });
  }
}
