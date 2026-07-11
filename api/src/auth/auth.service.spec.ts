import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { AuthService } from './auth.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('AuthService', () => {
  const configValues: Record<string, string> = {
    JWT_SECRET: 'test-secret',
    SMTP_HOST: 'smtp.test.local',
    SMTP_PORT: '587',
    SMTP_FROM: 'choninovet <no-reply@test.local>',
    APP_PUBLIC_URL: 'http://localhost:8081',
  };
  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  };
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  function createService(prismaOverrides: Record<string, unknown> = {}) {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        ...prismaOverrides,
      },
    };

    return {
      service: new AuthService(
        prisma as never,
        jwtService as unknown as JwtService,
        configService as never,
      ),
      prisma,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({});
  });

  it('creates public owner accounts as pending approval', async () => {
    const { service, prisma } = createService({
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'owner-1',
        email: 'owner@test.local',
        passwordHash: 'hash',
        role: UserRole.OWNER,
        status: AccountStatus.PENDING,
        ownerProfile: {
          id: 'profile-1',
          firstName: 'Owner',
          lastName: 'User',
          phone: null,
        },
        vetProfile: null,
      }),
    });

    await expect(
      service.register({
        email: 'owner@test.local',
        password: 'Password123',
        firstName: 'Owner',
        lastName: 'User',
      }),
    ).resolves.toMatchObject({
      message: 'Cuenta de propietario creada. Queda pendiente de aprobacion administrativa.',
      user: {
        email: 'owner@test.local',
        role: UserRole.OWNER,
        status: AccountStatus.PENDING,
      },
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: UserRole.OWNER,
          status: AccountStatus.PENDING,
        }),
      }),
    );
  });

  it('blocks login for pending accounts', async () => {
    const passwordHash = await bcrypt.hash('Password123', 10);
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue({
        id: 'owner-1',
        email: 'owner@test.local',
        passwordHash,
        role: UserRole.OWNER,
        status: AccountStatus.PENDING,
        ownerProfile: null,
        vetProfile: null,
      }),
    });

    await expect(
      service.login({ email: 'owner@test.local', password: 'Password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not reveal whether an email exists when requesting password reset', async () => {
    const { service, prisma } = createService({
      findUnique: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.requestPasswordReset({ email: 'missing@test.local' }),
    ).resolves.toEqual({
      message: 'Si el email existe, enviaremos instrucciones de recuperacion.',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'missing@test.local' },
      select: { id: true, email: true },
    });
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('sends password reset email without exposing the token in the response', async () => {
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@test.local',
      }),
    });
    jwtService.signAsync.mockResolvedValue('reset-token');

    const response = await service.requestPasswordReset({
      email: 'owner@test.local',
    });

    expect(response).toEqual({
      message: 'Si el email existe, enviaremos instrucciones de recuperacion.',
    });
    expect(response).not.toHaveProperty('devResetToken');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.test.local',
        port: 587,
      }),
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@test.local',
        subject: 'Recuperar contrasena - choninovet',
        text: expect.stringContaining('http://localhost:8081/forgot-password?token=reset-token'),
      }),
    );
  });

  it('updates password with a valid reset token', async () => {
    const { service, prisma } = createService();
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'owner@test.local',
      purpose: 'password-reset',
    });

    await expect(
      service.confirmPasswordReset({
        token: 'valid-token',
        newPassword: 'NewPassword123',
      }),
    ).resolves.toEqual({ message: 'Contrasena actualizada' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String) },
    });
  });
});
