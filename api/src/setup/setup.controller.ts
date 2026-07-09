import { Body, Controller, Get, Post } from '@nestjs/common';
import { ConfigureDatabaseDto } from './dto/configure-database.dto';
import { CreateInitialAdminDto } from './dto/create-initial-admin.dto';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  getStatus() {
    return this.setupService.getStatus();
  }

  @Post('database')
  configureDatabase(@Body() dto: ConfigureDatabaseDto) {
    return this.setupService.configureDatabase(dto);
  }

  @Post('admin')
  createInitialAdmin(@Body() dto: CreateInitialAdminDto) {
    return this.setupService.createInitialAdmin(dto);
  }
}
