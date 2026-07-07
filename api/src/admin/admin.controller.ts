import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminService } from './admin.service';
import { CreateVetUserDto } from './dto/create-vet-user.dto';
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
}
