import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { LabelsService } from './labels.service';
import { ItemsService } from '../items/items.service';

@Controller('labels')
export class LabelsController {
  constructor(
    private readonly labelsService: LabelsService,
    private readonly itemsService: ItemsService,
  ) {}

  @Get('generate/:itemId')
  async generateLabel(@Param('itemId') itemId: string, @Res() res: Response) {
    const item = await this.itemsService.findOne(itemId);
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const pdfBuffer = await this.labelsService.generateItemLabel(item);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="label-${item.barcode || item.id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
