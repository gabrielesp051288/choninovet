import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    await this.ensureEmailIsAvailable(dto.email);
    this.validateOwnerPayload(dto);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: UserRole.OWNER,
        status: AccountStatus.PENDING,
        ownerProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
          },
        },
      },
      include: {
        ownerProfile: true,
        vetProfile: true,
      },
    });

    return {
      message: 'Cuenta de propietario creada. Queda pendiente de aprobacion administrativa.',
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        ownerProfile: true,
        vetProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.status === AccountStatus.PENDING) {
      throw new UnauthorizedException('Cuenta pendiente de aprobacion administrativa');
    }

    if (user.status === AccountStatus.REJECTED) {
      throw new UnauthorizedException('Cuenta rechazada por administracion');
    }

    return this.buildAuthResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownerProfile: true,
        vetProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownerProfile: true,
        vetProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.role === UserRole.OWNER) {
      if (!user.ownerProfile) {
        throw new BadRequestException('Perfil de propietario no encontrado');
      }

      await this.prisma.ownerProfile.update({
        where: { id: user.ownerProfile.id },
        data: {
          firstName: dto.firstName?.trim() || user.ownerProfile.firstName,
          lastName: dto.lastName?.trim() || user.ownerProfile.lastName,
          phone: dto.phone === undefined ? user.ownerProfile.phone : cleanOptional(dto.phone),
        },
      });
    }

    if (user.role === UserRole.VET) {
      if (!user.vetProfile) {
        throw new BadRequestException('Perfil de veterinario/a no encontrado');
      }

      await this.prisma.vetProfile.update({
        where: { id: user.vetProfile.id },
        data: {
          clinicName: dto.clinicName?.trim() || user.vetProfile.clinicName,
          managerName:
            dto.managerName === undefined
              ? user.vetProfile.managerName
              : cleanOptional(dto.managerName),
          phone: dto.phone === undefined ? user.vetProfile.phone : cleanOptional(dto.phone),
          address: dto.address === undefined ? user.vetProfile.address : cleanOptional(dto.address),
          description:
            dto.description === undefined
              ? user.vetProfile.description
              : cleanOptional(dto.description),
        },
      });
    }

    return this.getMe(userId);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const emailConfig = this.getEmailConfig();
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true },
    });

    if (!user) {
      return {
        message: 'Si el email existe, enviaremos instrucciones de recuperacion.',
      };
    }

    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        purpose: 'password-reset',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    await this.sendPasswordResetEmail(user.email, resetToken, emailConfig);

    return {
      message: 'Si el email existe, enviaremos instrucciones de recuperacion.',
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    let payload: PasswordResetPayload;

    try {
      payload = await this.jwtService.verifyAsync<PasswordResetPayload>(dto.token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de recuperacion invalido o vencido');
    }

    if (payload.purpose !== 'password-reset' || !payload.sub) {
      throw new UnauthorizedException('Token de recuperacion invalido');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });

    return {
      message: 'Contrasena actualizada',
    };
  }

  private async ensureEmailIsAvailable(email: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email ya registrado');
    }
  }

  private validateOwnerPayload(dto: RegisterDto) {
    if (!dto.firstName || !dto.lastName) {
      throw new BadRequestException('El perfil de propietario requiere nombre y apellido');
    }
  }

  private async buildAuthResponse(user: AuthUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '8h',
    });

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: AuthUser) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private getEmailConfig() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM');
    const appPublicUrl = this.configService.get<string>('APP_PUBLIC_URL');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;

    if (!host || !from || !appPublicUrl || Number.isNaN(port)) {
      throw new BadRequestException(
        'Servicio de email no configurado. Revisa SMTP_HOST, SMTP_FROM y APP_PUBLIC_URL.',
      );
    }

    return {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      from,
      appPublicUrl,
    };
  }

  private async sendPasswordResetEmail(
    email: string,
    token: string,
    config: ReturnType<AuthService['getEmailConfig']>,
  ) {
    const resetUrl = new URL('/forgot-password', config.appPublicUrl);
    resetUrl.searchParams.set('token', token);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'Recuperar contrasena - choninovet',
      text: [
        'Recibimos una solicitud para recuperar tu contrasena en choninovet.',
        '',
        `Abri este enlace para crear una nueva contrasena: ${resetUrl.toString()}`,
        '',
        'El enlace vence en 15 minutos. Si no solicitaste este cambio, podes ignorar este email.',
      ].join('\n'),
      html: `
        <p>Recibimos una solicitud para recuperar tu contrasena en <strong>choninovet</strong>.</p>
        <p><a href="${resetUrl.toString()}">Crear nueva contrasena</a></p>
        <p>El enlace vence en 15 minutos. Si no solicitaste este cambio, podes ignorar este email.</p>
      `,
    });
  }
}

type AuthUser = Awaited<
  ReturnType<
    PrismaService['user']['findUnique']
  >
> & {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
};

type PasswordResetPayload = {
  sub: string;
  email: string;
  purpose: string;
};

function cleanOptional(value?: string) {
  const trimmed = value?.trim();

  return trimmed || null;
}
