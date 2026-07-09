import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { AccountStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ConfigureDatabaseDto } from './dto/configure-database.dto';
import { CreateInitialAdminDto } from './dto/create-initial-admin.dto';

const execFileAsync = promisify(execFile);

type DatabaseStatus = {
  configured: boolean;
  connected: boolean;
  migrationsApplied: boolean;
  hasAdmin: boolean;
  error: string | null;
};

@Injectable()
export class SetupService {
  async getStatus() {
    const databaseStatus = await this.getDatabaseStatus();

    return {
      status: databaseStatus.hasAdmin ? 'ready' : 'setup_required',
      database: databaseStatus,
      needsDatabase: !databaseStatus.configured || !databaseStatus.connected,
      needsMigrations:
        databaseStatus.configured &&
        databaseStatus.connected &&
        !databaseStatus.migrationsApplied,
      needsAdmin:
        databaseStatus.configured &&
        databaseStatus.connected &&
        databaseStatus.migrationsApplied &&
        !databaseStatus.hasAdmin,
    };
  }

  async configureDatabase(dto: ConfigureDatabaseDto) {
    const databaseUrl = buildMysqlUrl(dto);

    await this.validateDatabaseConnection(databaseUrl);
    await this.runPrismaMigrations(databaseUrl);
    this.writeEnvValue('DATABASE_URL', databaseUrl);
    process.env.DATABASE_URL = databaseUrl;

    return {
      message: 'Base de datos configurada correctamente',
      database: {
        host: dto.host,
        port: dto.port,
        name: dto.database,
        username: dto.username,
      },
      restartRequired: true,
    };
  }

  async assertSetupWriteAllowed(user?: { role?: string }) {
    const hasAdmin = await this.hasAdmin();

    if (!hasAdmin) {
      return;
    }

    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Se requiere rol administrador');
    }
  }

  async hasAdmin() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return false;
    }

    const prisma = this.createClient(databaseUrl);

    try {
      const adminCount = await prisma.user.count({
        where: { role: UserRole.ADMIN },
      });

      return adminCount > 0;
    } catch {
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }

  async createInitialAdmin(dto: CreateInitialAdminDto) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new BadRequestException('Primero configura la base de datos');
    }

    const prisma = this.createClient(databaseUrl);

    try {
      const adminCount = await prisma.user.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount > 0) {
        throw new ConflictException('Ya existe una cuenta administradora');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const admin = await prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: UserRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      return {
        message: 'Administrador inicial creado correctamente',
        user: admin,
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  private async getDatabaseStatus(): Promise<DatabaseStatus> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return {
        configured: false,
        connected: false,
        migrationsApplied: false,
        hasAdmin: false,
        error: null,
      };
    }

    const prisma = this.createClient(databaseUrl);

    try {
      await prisma.$queryRaw`SELECT 1`;

      const userCount = await prisma.user.count();
      const adminCount = await prisma.user.count({
        where: { role: UserRole.ADMIN },
      });

      return {
        configured: true,
        connected: true,
        migrationsApplied: userCount >= 0,
        hasAdmin: adminCount > 0,
        error: null,
      };
    } catch (error) {
      return {
        configured: true,
        connected: this.isMigrationError(error),
        migrationsApplied: false,
        hasAdmin: false,
        error: getErrorMessage(error),
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  private async validateDatabaseConnection(databaseUrl: string) {
    const prisma = this.createClient(databaseUrl);

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new BadRequestException(
        `No se pudo conectar con MySQL: ${getErrorMessage(error)}`,
      );
    } finally {
      await prisma.$disconnect();
    }
  }

  private async runPrismaMigrations(databaseUrl: string) {
    const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    try {
      await execFileAsync(npxCommand, ['prisma', 'migrate', 'deploy'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `No se pudieron aplicar las migraciones Prisma: ${getErrorMessage(error)}`,
      );
    }
  }

  private writeEnvValue(key: string, value: string) {
    const envPath = join(process.cwd(), '.env');
    const line = `${key}=${JSON.stringify(value)}`;
    const currentContent = existsSync(envPath)
      ? readFileSync(envPath, 'utf8')
      : '';
    const lines = currentContent
      .split(/\r?\n/)
      .filter((currentLine) => currentLine.length > 0);
    const keyPrefix = `${key}=`;
    const existingIndex = lines.findIndex((currentLine) =>
      currentLine.startsWith(keyPrefix),
    );

    if (existingIndex >= 0) {
      lines[existingIndex] = line;
    } else {
      lines.unshift(line);
    }

    writeFileSync(envPath, `${lines.join('\n')}\n`, 'utf8');
  }

  private createClient(databaseUrl: string) {
    return new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  private isMigrationError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return 'code' in error && ['P2021', 'P2022'].includes(String(error.code));
  }
}

function buildMysqlUrl(dto: ConfigureDatabaseDto) {
  const username = encodeURIComponent(dto.username);
  const password = encodeURIComponent(dto.password);
  const database = encodeURIComponent(dto.database);

  return `mysql://${username}:${password}@${dto.host}:${dto.port}/${database}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return redactSecret(error.message);
  }

  return 'Error desconocido';
}

function redactSecret(message: string) {
  return message
    .replace(/mysql:\/\/([^:\s]+):([^@\s]+)@/gi, 'mysql://$1:***@')
    .replace(/password=([^&\s]+)/gi, 'password=***');
}
