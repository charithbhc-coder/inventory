import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GatePassesService } from './gate-passes.service';
import { CreateGatePassDto, AppendToGatePassDto, ReturnGatePassDto } from './dto/gate-pass.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('gate-passes')
@UseGuards(JwtAuthGuard)
export class GatePassesController {
  constructor(private readonly gatePassesService: GatePassesService) {}

  @Post()
  create(@Body() dto: CreateGatePassDto, @Request() req: any) {
    return this.gatePassesService.create(dto, req.user.sub);
  }

  @Get('active')
  findAllActive() {
    return this.gatePassesService.findAllActive();
  }

  @Post(':id/append')
  append(@Param('id') id: string, @Body() dto: AppendToGatePassDto, @Request() req: any) {
    return this.gatePassesService.append(id, dto, req.user.sub);
  }

  @Post(':id/return')
  markReturned(@Param('id') id: string, @Body() dto: ReturnGatePassDto, @Request() req: any) {
    return this.gatePassesService.markReturned(id, dto, req.user.sub);
  }
}
