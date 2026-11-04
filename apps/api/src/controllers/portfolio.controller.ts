import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import type {
  PortfolioAllocationResponse,
  TargetAllocationRequest,
} from '../models/allocation.model.js';
import type { PortfolioDividendResponse } from '../models/dividend.model.js';
import type { PortfolioPerformanceResponse } from '../models/performance.model.js';
import type { PortfolioHoldingsResponse } from '../models/portfolio.model.js';
import { AllocationService } from '../services/allocation.service.js';
import { DividendService } from '../services/dividend.service.js';
import { PerformanceService } from '../services/performance.service.js';
import { ValuationService } from '../services/valuation.service.js';

@Controller(['portfolio', 'api/backend/portfolio'])
@UseGuards(ApiKeyGuard)
export class PortfolioController {
  constructor(
    private readonly valuationService: ValuationService,
    private readonly performanceService: PerformanceService,
    private readonly allocationService: AllocationService,
    private readonly dividendService: DividendService,
  ) {}

  @Get('holdings')
  async getPortfolioHoldings(
    @Query('tab_id') tabId: string = 'all',
    @Query('currency') currency: string = 'THB',
  ): Promise<PortfolioHoldingsResponse> {
    return this.valuationService.getPortfolioHoldings(tabId, currency);
  }

  @Get('performance')
  async getPortfolioPerformance(
    @Query('timeframe') timeframe: string = 'ALL',
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('currency') currency: string = 'THB',
  ): Promise<PortfolioPerformanceResponse> {
    return this.performanceService.getPerformanceAnalytics(
      timeframe,
      startDate,
      endDate,
      currency,
    );
  }

  @Post('allocation')
  @HttpCode(HttpStatus.OK)
  async getPortfolioAllocation(
    @Body() body?: TargetAllocationRequest,
    @Query('currency') currency: string = 'THB',
  ): Promise<PortfolioAllocationResponse> {
    const targets = body?.targetAllocation || null;
    return this.allocationService.calculateAllocation(targets, currency);
  }

  @Get('dividend')
  async getPortfolioDividend(
    @Query('currency') currency: string = 'THB',
    @Query('tab_id') tabId: string = 'all',
  ): Promise<PortfolioDividendResponse> {
    return this.dividendService.getDividendAnalytics(currency, tabId);
  }
}
