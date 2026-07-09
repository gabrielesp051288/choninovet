import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ConfigureDatabaseDto } from './dto/configure-database.dto';
import { CreateInitialAdminDto } from './dto/create-initial-admin.dto';
import { SetupGuard } from './setup.guard';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  getStatus() {
    return this.setupService.getStatus();
  }

  @Post('database')
  @UseGuards(SetupGuard)
  configureDatabase(@Body() dto: ConfigureDatabaseDto) {
    return this.setupService.configureDatabase(dto);
  }

  @Post('admin')
  @UseGuards(SetupGuard)
  createInitialAdmin(@Body() dto: CreateInitialAdminDto) {
    return this.setupService.createInitialAdmin(dto);
  }
}
