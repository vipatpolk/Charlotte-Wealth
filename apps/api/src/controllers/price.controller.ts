import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { PriceService } from '../services/price.service.js';

@Controller(['price', 'api/backend/price'])
@UseGuards(ApiKeyGuard)
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Post('fetch-prices')
  async fetchPricesAndRate(
    @Body() body: { summaries: { symbol: string; assetType?: string }[] },
  ) {
    return this.priceService.fetchPricesAndRate(body?.summaries || []);
  }

  @Get('exchange-rate')
  async fetchExchangeRate(
    @Query('from_currency') fromCurrency: string = 'USD',
    @Query('to_currency') toCurrency: string = 'THB',
  ) {
    const rate = await this.priceService.fetchExchangeRate(
      fromCurrency,
      toCurrency,
    );
    return { rate };
  }
}

