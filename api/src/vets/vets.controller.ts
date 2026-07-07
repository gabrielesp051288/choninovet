import { Controller, Get, Param } from '@nestjs/common';
import { VetsService } from './vets.service';

@Controller('vets')
export class VetsController {
  constructor(private readonly vetsService: VetsService) {}

  @Get()
  list() {
    return this.vetsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vetsService.findOne(id);
  }
}
