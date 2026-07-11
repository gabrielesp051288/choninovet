import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminService } from './admin.service';
import { CreateVetUserDto } from './dto/create-vet-user.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: { sub: string; role: UserRole }) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.getDashboard();
  }

  @Get('vets/:id')
  getVetDetail(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id') id: string,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.getVetDetail(id);
  }

  @Get('owners/:id')
  getOwnerDetail(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id') id: string,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.getOwnerDetail(id);
  }

  @Get('pets/:id')
  getPetDetail(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id') id: string,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.getPetDetail(id);
  }

  @Get('extensions')
  getExtensions(@CurrentUser() user: { sub: string; role: UserRole }) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.getExtensions();
  }

  @Post('extensions/register')
  registerExtension(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() manifest: Record<string, unknown>,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.registerExtension(user.sub, manifest);
  }

  @Post('vets')
  createVet(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() dto: CreateVetUserDto,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.createVetUser(user.sub, dto);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.updateUserStatus(user.sub, id, dto);
  }

  @Patch('extensions/:key')
  updateExtension(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('key') key: string,
    @Body() dto: UpdateExtensionDto,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.updateExtension(user.sub, key, dto);
  }

  @Delete('extensions/:key')
  uninstallExtension(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('key') key: string,
  ) {
    this.adminService.assertAdmin(user.role);
    return this.adminService.uninstallExtension(user.sub, key);
  }
}
