import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExtensionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExtensionsService {
  constructor(private readonly prisma: PrismaService) {}

  listActiveExtensions() {
    return this.prisma.extension.findMany({
      where: {
        isInstalled: true,
        status: ExtensionStatus.ACTIVE,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async assertActiveExtension(key: string, adapter?: string) {
    const extension = await this.prisma.extension.findFirst({
      where: {
        key,
        isInstalled: true,
        status: ExtensionStatus.ACTIVE,
      },
    });

    if (!extension) {
      throw new ForbiddenException('Extension inactiva o no instalada');
    }

    if (adapter) {
      const manifest = extension.manifest;
      const manifestAdapter =
        manifest && typeof manifest === 'object' && !Array.isArray(manifest)
          ? (manifest as { adapter?: unknown }).adapter
          : undefined;

      if (manifestAdapter !== adapter) {
        throw new ForbiddenException('Adapter de extension no permitido');
      }
    }

    return extension;
  }
}
