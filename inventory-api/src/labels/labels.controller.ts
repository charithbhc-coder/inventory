import { Controller, Get, Param, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { LabelsService } from './labels.service';
import { ItemsService } from '../items/items.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UserRole, AdminPermission } from '../common/enums';



@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('labels')
export class LabelsController {
  constructor(
    private readonly labelsService: LabelsService,
    private readonly itemsService: ItemsService,
  ) {}

  @Get('generate/:itemId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(AdminPermission.GENERATE_BARCODES)
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
