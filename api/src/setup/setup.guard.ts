import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SetupService } from './setup.service';

type SetupRequest = Request & {
  user?: {
    sub: string;
    email: string;
    role: string;
  };
};

@Injectable()
export class SetupGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly setupService: SetupService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const hasAdmin = await this.setupService.hasAdmin();

    if (!hasAdmin) {
      return true;
    }

    const request = context.switchToHttp().getRequest<SetupRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const user = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      request.user = user;
      await this.setupService.assertSetupWriteAllowed(user);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private extractToken(request: Request) {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
