import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import type {
  RebalanceCalculateRequest,
  RebalanceCalculateResponse,
  SimulateOrderRequest,
  SimulateOrderResponse,
  SolveTargetCostRequest,
  SolveTargetCostResponse,
  TvmCalculateRequest,
  TvmCalculateResponse,
} from '../models/tools.model.js';
import { ToolsService } from '../services/tools.service.js';

@Controller(['portfolio/tools', 'api/backend/portfolio/tools'])
@UseGuards(ApiKeyGuard)
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  async simulateOrders(
    @Body() req: SimulateOrderRequest,
  ): Promise<SimulateOrderResponse> {
    return this.toolsService.simulateOrder(req);
  }

  @Post('solve-target')
  @HttpCode(HttpStatus.OK)
  async solveTargetCost(
    @Body() req: SolveTargetCostRequest,
  ): Promise<SolveTargetCostResponse> {
    return this.toolsService.solveTargetCost(req);
  }

  @Post('tvm')
  @HttpCode(HttpStatus.OK)
  async calculateTvm(
    @Body() req: TvmCalculateRequest,
  ): Promise<TvmCalculateResponse> {
    return this.toolsService.calculateTvm(req);
  }

  @Post('rebalance')
  @HttpCode(HttpStatus.OK)
  async calculateRebalance(
    @Body() req: RebalanceCalculateRequest,
  ): Promise<RebalanceCalculateResponse> {
    return this.toolsService.calculateRebalance(req);
  }
}
