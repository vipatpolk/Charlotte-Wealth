import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { SheetResult } from '../models/transaction.model.js';
import { ShareLotService } from '../services/share-lot.service.js';

@Controller(['share-lot', 'api/backend/share-lot'])
@UseGuards(ApiKeyGuard)
export class ShareLotController {
  constructor(private readonly shareLotService: ShareLotService) {}

  @Get('sheet/:tabId')
  async fetchSheet(@Param('tabId') tabId: string): Promise<SheetResult> {
    return this.shareLotService.fetchSheet(tabId);
  }

  @Get('sheets')
  async fetchAllSheets(): Promise<SheetResult> {
    return this.shareLotService.fetchAllSheets();
  }
}

