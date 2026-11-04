import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { NavController } from './controllers/nav.controller.js';
import { PortfolioController } from './controllers/portfolio.controller.js';
import { PriceController } from './controllers/price.controller.js';
import { ShareLotController } from './controllers/share-lot.controller.js';
import { ToolsController } from './controllers/tools.controller.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { AllocationService } from './services/allocation.service.js';
import { DividendService } from './services/dividend.service.js';
import { NavService } from './services/nav.service.js';
import { PerformanceService } from './services/performance.service.js';
import { PriceService } from './services/price.service.js';
import { ShareLotService } from './services/share-lot.service.js';
import { ToolsService } from './services/tools.service.js';
import { ValuationService } from './services/valuation.service.js';

@Module({
  imports: [],
  controllers: [
    AppController,
    ShareLotController,
    PriceController,
    NavController,
    PortfolioController,
    ToolsController,
  ],
  providers: [
    AppService,
    ApiKeyGuard,
    ShareLotService,
    NavService,
    PriceService,
    ValuationService,
    AllocationService,
    PerformanceService,
    DividendService,
    ToolsService,
  ],
})
export class AppModule {}
