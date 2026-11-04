import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioPosition, PortfolioSummary } from '../../models/portfolio.model';
import { PriceData } from '../../services/price.service';
import { AvgCostSimulationResult, ToolDefinition, ToolId } from '../../models/tools.model';
import { AvgCostCalculatorComponent } from './avg-cost-calculator/avg-cost-calculator.component';
import { TvmCalculatorComponent } from './tvm-calculator/tvm-calculator.component';
import { RebalanceCalculatorComponent } from './rebalance-calculator/rebalance-calculator.component';

@Component({
  selector: 'app-tools',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AvgCostCalculatorComponent, TvmCalculatorComponent, RebalanceCalculatorComponent],
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.css'],
})
export class ToolsComponent {
  portfolioPositions = input.required<PortfolioPosition[]>();
  portfolioSummary = input<PortfolioSummary | null>(null);
  pricesMap = input.required<Map<string, PriceData>>();
  displayCurrency = input.required<'USD' | 'THB'>();
  exchangeRate = input.required<number>();
  hasRate = input.required<boolean>();
  privacyMode = input<boolean>(false);
  initialToolId = input<ToolId | undefined>(undefined);

  selectedSymbolChange = output<string>();

  readonly activeToolId = signal<ToolId>('avg-cost-calculator');
  readonly selectedToolSymbol = signal<string>('');
  readonly isDropdownOpen = signal<boolean>(false);

  constructor() {
    effect(() => {
      const tool = this.initialToolId();
      if (tool) {
        this.selectTool(tool);
      }
    });
  }

  readonly toolsList: ToolDefinition[] = [
    {
      id: 'avg-cost-calculator',
      title: 'Average Cost Calculator',
      shortTitle: 'Avg Cost',
      description: 'Simulate Buy / Sell orders to project changes in average cost basis, breakeven, and P/L.',
      icon: 'calculator',
      badge: 'Active',
      isReady: true,
    },
    {
      id: 'tvm-calculator',
      title: 'Time Value of Money (TVM) Calculator',
      shortTitle: 'TVM Calculator',
      description: 'Calculate Future Value, required contributions, target growth rates, and horizons with flexible compounding frequencies.',
      icon: 'trending-up',
      badge: 'Active',
      isReady: true,
    },
    {
      id: 'rebalance-planner',
      title: 'Portfolio Rebalance Planner',
      shortTitle: 'Rebalance',
      description: 'Compute precise trade orders and cash adjustments to match your ideal target asset allocation.',
      icon: 'pie-chart',
      badge: 'Active',
      isReady: true,
    },
  ];


  readonly activeTool = computed(() => {
    return this.toolsList.find((t) => t.id === this.activeToolId()) || this.toolsList[0];
  });

  selectTool(toolId: ToolId): void {
    const tool = this.toolsList.find((t) => t.id === toolId);
    if (tool && tool.isReady) {
      this.activeToolId.set(toolId);
      this.closeDropdown();
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  onSymbolChange(symbol: string): void {
    this.selectedToolSymbol.set(symbol);
    this.selectedSymbolChange.emit(symbol);
  }
}
