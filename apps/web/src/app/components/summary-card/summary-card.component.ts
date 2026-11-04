import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, DatePipe, SymbolIconComponent],
  templateUrl: './summary-card.component.html'
})
export class SummaryCardComponent {
  type = input.required<'open' | 'closed'>();
  summary = input.required<any>();
  isAllTab = input.required<boolean>();
  isClosedTab = input.required<boolean>();
  hasPriceData = input.required<boolean>();
  pricesLoading = input.required<boolean>();
  isExpanded = input.required<boolean>();
  
  toggleExpand = output<string>();
  openHistory = output<string>();
  
  // Formatters as inputs
  getSymbolColor = input.required<(symbol: string) => string>();
  getDisplaySymbol = input.required<(symbol: string) => string>();
  getSymbolName = input.required<(symbol: string, rawName?: string) => string>();
  getAssetTypeClass = input.required<(type?: string, symbol?: string) => string>();
  getAssetTypeLabel = input.required<(type?: string, symbol?: string) => string>();
  getQuantityFormat = input.required<(symbol: string) => string>();
  getPriceFormat = input.required<(symbol: string) => string>();
  
  // Currency handling
  cx = input.required<(amount: number, currency: string) => number>();
  dc = input.required<(currency?: string) => string>();
  
  // Metrics for open positions
  getCurrentPriceConverted = input.required<(summary: any) => number>();
  getHoldingValue = input.required<(summary: any) => number>();
  getUnrealizedPL = input.required<(summary: any) => number>();
  getUnrealizedPLPercent = input.required<(summary: any) => number>();
  getLotHoldingValue = input.required<(lot: any, summary: any) => number>();
  getLotUnrealizedPL = input.required<(lot: any, summary: any) => number>();

  // PVD Contribution Helpers
  getEmployeeShares(summary: any): number {
    if (summary.employeeShares !== undefined && summary.employeeShares !== null) {
      return summary.employeeShares;
    }
    const lot = summary.lots?.find((l: any) => l.note?.includes('Employee'));
    return lot ? lot.quantity : 0;
  }

  getEmployerShares(summary: any): number {
    if (summary.employerShares !== undefined && summary.employerShares !== null) {
      return summary.employerShares;
    }
    const lot = summary.lots?.find((l: any) => l.note?.includes('Employer'));
    return lot ? lot.quantity : 0;
  }

  getEmployeePercent(summary: any): number {
    const total = summary.totalShares || 0;
    if (total <= 0) return 0;
    return (this.getEmployeeShares(summary) / total) * 100;
  }

  getEmployerPercent(summary: any): number {
    const total = summary.totalShares || 0;
    if (total <= 0) return 0;
    return (this.getEmployerShares(summary) / total) * 100;
  }

  getEmployeeContribution(summary: any): number {
    if (summary.employeeContribution !== undefined && summary.employeeContribution !== null) {
      return summary.employeeContribution;
    }
    const lot = summary.lots?.find((l: any) => l.note?.includes('Employee'));
    return lot ? lot.totalCost : 0;
  }

  getEmployeeEarnings(summary: any): number {
    if (summary.employeeEarnings !== undefined && summary.employeeEarnings !== null) {
      return summary.employeeEarnings;
    }
    const val = this.getEmployeeValue(summary);
    const contrib = this.getEmployeeContribution(summary);
    return Math.max(0, val - contrib);
  }

  getEmployeeValue(summary: any): number {
    if (
      summary.employeeContribution !== undefined &&
      summary.employeeContribution !== null &&
      summary.employeeEarnings !== undefined &&
      summary.employeeEarnings !== null
    ) {
      return summary.employeeContribution + summary.employeeEarnings;
    }
    const nav = summary.currentPrice || summary.averageCost || 0;
    return this.getEmployeeShares(summary) * nav;
  }

  getEmployerMatching(summary: any): number {
    if (summary.employerMatching !== undefined && summary.employerMatching !== null) {
      return summary.employerMatching;
    }
    const lot = summary.lots?.find((l: any) => l.note?.includes('Employer'));
    return lot ? lot.totalCost : 0;
  }

  getEmployerEarnings(summary: any): number {
    if (summary.employerEarnings !== undefined && summary.employerEarnings !== null) {
      return summary.employerEarnings;
    }
    const val = this.getEmployerValue(summary);
    const match = this.getEmployerMatching(summary);
    return Math.max(0, val - match);
  }

  getEmployerValue(summary: any): number {
    if (
      summary.employerMatching !== undefined &&
      summary.employerMatching !== null &&
      summary.employerEarnings !== undefined &&
      summary.employerEarnings !== null
    ) {
      return summary.employerMatching + summary.employerEarnings;
    }
    const nav = summary.currentPrice || summary.averageCost || 0;
    return this.getEmployerShares(summary) * nav;
  }
}
