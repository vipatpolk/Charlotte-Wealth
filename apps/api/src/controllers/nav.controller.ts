import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { NavService } from '../services/nav.service.js';

@Controller(['nav', 'api/backend/nav'])
@UseGuards(ApiKeyGuard)
export class NavController {
  constructor(private readonly navService: NavService) {}

  @Post('fetch')
  async fetchNavs(@Body() body: { symbols: string[] }) {
    return this.navService.fetchFundNavs(body?.symbols || []);
  }
}

