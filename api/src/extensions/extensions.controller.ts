import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ExtensionsService } from './extensions.service';

@Controller('extensions')
@UseGuards(AuthGuard)
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  @Get('active')
  listActiveExtensions() {
    return this.extensionsService.listActiveExtensions();
  }
}
