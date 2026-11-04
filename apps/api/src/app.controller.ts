import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { PortfolioSummary } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api/portfolio')
  getPortfolio(): PortfolioSummary {
    return this.appService.getPortfolio();
  }
}
