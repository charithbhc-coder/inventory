import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService, GlobalSearchResult } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  async globalSearch(@Query('q') query: string): Promise<GlobalSearchResult[]> {
    return this.searchService.globalSearch(query);
  }
}
