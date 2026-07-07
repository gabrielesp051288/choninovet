import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditInput = {
  action: string;
  actorUserId?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  entityType: string;
  metadata?: Prisma.InputJsonValue;
  summary: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: AuditInput) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        entityId: input.entityId ?? null,
        entityName: input.entityName ?? null,
        entityType: input.entityType,
        metadata: input.metadata,
        summary: input.summary,
      },
    });
  }
}
