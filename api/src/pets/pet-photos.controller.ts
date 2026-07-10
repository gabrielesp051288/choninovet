import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Response } from 'express';

@Controller('pet-photos')
export class PetPhotosController {
  @Get(':filename')
  getPhoto(@Param('filename') filename: string, @Res() response: Response) {
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new NotFoundException('Imagen no encontrada');
    }

    const filePath = join(process.cwd(), 'uploads', 'pets', filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Imagen no encontrada');
    }

    return response.sendFile(filePath);
  }
}
