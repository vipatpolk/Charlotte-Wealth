import { Component, input, signal, computed, inject, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { DateRangePickerComponent, DateRange } from '../date-range-picker/date-range-picker.component';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';
import { SymbolSummary, ClosedSymbolSummary, SymbolTransactionSummary, Transaction } from '../../models/transaction.model';
import { PriceData } from '../../services/price.service';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioPerformanceResponse } from '../../models/portfolio.model';
import { getAssetType, getAssetTypeLabel, getAssetColor, getSymbolColor, displaySymbol, resolveSymbolName, convertCurrency } from '../../utils/format.utils';

@Component({
  selector: 'app-performance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, DateRangePickerComponent, SymbolIconComponent],
  templateUrl: './performance.component.html',
  styleUrls: ['./performance.component.css']
})
export class PerformanceComponent {
  private readonly portfolioService = inject(PortfolioService);

  summaries = input.required<SymbolSummary[]>();
  closedSummaries = input.required<ClosedSymbolSummary[]>();
  transactionSummaries = input.required<SymbolTransactionSummary[]>();
  rawTransactions = input.required<Transaction[]>();
  pricesMap = input.required<Map<string, PriceData>>();
  displayCurrency = input.required<'USD' | 'THB'>();
  exchangeRate = input.required<number>();
  hasRate = input.required<boolean>();

  startDate = signal<string>('');
  endDate = signal<string>('');
  searchQuery = signal<string>('');
  assetTypeFilter = signal<string>('all');
  statusFilter = signal<string>('all');
  sortField = signal<string>('totalReturn');
  sortDirection = signal<'asc' | 'desc'>('desc');
  showAllSymbols = signal<boolean>(false);

  readonly serverPerformance = signal<PortfolioPerformanceResponse | null>(null);

  readonly sortOptions = [
    { field: 'symbol', label: 'Symbol' },
    { field: 'totalReturn', label: 'Total Return %' },
    { field: 'totalReturnAmount', label: 'Total Return $' },
    { field: 'investedCost', label: 'Invested Cost' },
    { field: 'currentValue', label: 'Current Value' },
    { field: 'realizedPL', label: 'Realized P/L' },
    { field: 'unrealizedPL', label: 'Unrealized P/L' },
  ];

  getAssetColor = getAssetColor;

  private cx(value: number, originalCurrency: string): number {
    if (!this.hasRate()) {
      const target = this.displayCurrency();
      const orig = originalCurrency === 'USDT' ? 'USD' : originalCurrency;
      if (orig !== target) return value;
      return value;
    }
    return convertCurrency(value, originalCurrency, this.displayCurrency(), this.exchangeRate());
  }

  constructor() {
    effect(() => {
      const curr = this.displayCurrency();
      const start = this.startDate();
      const end = this.endDate();
      const tf = start || end ? 'CUSTOM' : 'ALL';

      this.portfolioService.fetchPerformance(tf, start, end, curr).subscribe({
        next: (res) => {
          if (!res.error) {
            this.serverPerformance.set(res);
          }
        },
      });
    });
  }

  assetTypeOptions = computed(() => {
    const types = new Set<string>();
    for (const s of this.summaries()) {
      types.add(getAssetType(s.assetType || '', s.symbol));
    }
    for (const c of this.closedSummaries()) {
      types.add(getAssetType(c.assetType || '', c.symbol));
    }
    const options = [{ value: 'all', label: 'All' }];
    for (const t of Array.from(types).sort()) {
      options.push({ value: t, label: getAssetTypeLabel(t) });
    }
    return options;
  });

  assetTypePerformance = computed(() => {
    const perf = this.serverPerformance();
    if (perf && perf.assetTypePerformance && perf.assetTypePerformance.length > 0) {
      return perf.assetTypePerformance.map((t) => ({
        type: t.assetType,
        label: t.label,
        investedCost: this.cx(t.investedCost, perf.currency),
        currentValue: this.cx(t.currentValue, perf.currency),
        realizedPL: this.cx(t.realizedPL, perf.currency),
        unrealizedPL: this.cx(t.unrealizedPL, perf.currency),
        totalReturn: this.cx(t.totalReturn, perf.currency),
        totalReturnPercent: t.totalReturnPercent,
        openSymbolCount: t.openSymbolCount,
        closedSymbolCount: t.closedSymbolCount,
        color: this.getAssetColor(t.assetType),
      }));
    }

    // Fallback client computation
    const typeMap = new Map<string, any>();
    for (const summary of this.summaries()) {
      const type = getAssetType(summary.assetType || '', summary.symbol);
      const originalCurrency = summary.currency;
      const priceData = this.pricesMap().get(summary.symbol);
      const investedCost = this.cx(summary.totalCost, originalCurrency);

      let currentValue = 0;
      if (priceData && priceData.price > 0) {
        currentValue = this.cx(summary.totalShares * priceData.price, priceData.currency);
      } else {
        currentValue = this.cx(summary.totalShares * summary.averageCost, originalCurrency);
      }

      if (!typeMap.has(type)) {
        typeMap.set(type, { type, investedCost: 0, currentValue: 0, realizedPL: 0, unrealizedPL: 0, openSymbolCount: 0, closedSymbolCount: 0 });
      }
      const t = typeMap.get(type);
      t.investedCost += investedCost;
      t.currentValue += currentValue;
      t.unrealizedPL += (currentValue - investedCost);
      t.openSymbolCount += 1;
    }

    const start = this.startDate();
    const end = this.endDate();
    for (const closed of this.closedSummaries()) {
      const type = getAssetType(closed.assetType || '', closed.symbol);
      const originalCurrency = closed.currency;

      if (!typeMap.has(type)) {
        typeMap.set(type, { type, investedCost: 0, currentValue: 0, realizedPL: 0, unrealizedPL: 0, openSymbolCount: 0, closedSymbolCount: 0 });
      }
      const t = typeMap.get(type);
      t.closedSymbolCount += 1;

      let realizedPL = 0;
      let investedCost = 0;
      for (const lot of closed.lots) {
        if ((!start || !end) || (lot.closeDate >= start && lot.closeDate <= end)) {
          const lotCurrency = lot.currency || originalCurrency;
          realizedPL += this.cx(lot.realizedPL, lotCurrency);
          investedCost += this.cx(lot.totalCost, lotCurrency);
        }
      }
      t.realizedPL += realizedPL;
      t.investedCost += investedCost;
    }

    return Array.from(typeMap.values()).map(t => {
      const totalReturn = t.realizedPL + t.unrealizedPL;
      const totalReturnPercent = t.investedCost > 0 ? (totalReturn / t.investedCost) * 100 : 0;
      return {
        ...t,
        totalReturn,
        totalReturnPercent,
        color: this.getAssetColor(t.type),
        label: getAssetTypeLabel(t.type)
      };
    }).sort((a, b) => b.totalReturnPercent - a.totalReturnPercent);
  });

  rawSymbolPerformance = computed(() => {
    const perf = this.serverPerformance();
    if (perf && perf.symbolPerformance && perf.symbolPerformance.length > 0) {
      return perf.symbolPerformance.map((s) => {
        const invCost = this.cx(s.investedCost, perf.currency);
        const curVal = this.cx(s.currentValue, perf.currency);
        const unPL = this.cx(s.unrealizedPL, perf.currency);
        const rePL = this.cx(s.realizedPL, perf.currency);
        const totRet = this.cx(s.totalReturnAmount ?? s.totalReturn, perf.currency);
        return {
          ...s,
          investedCost: invCost,
          currentValue: curVal,
          unrealizedPL: unPL,
          realizedPL: rePL,
          totalReturnAmount: totRet,
          totalReturn: totRet,
          color: getSymbolColor(s.symbol),
          name: s.name || resolveSymbolName(s.symbol, this.pricesMap()),
          displaySymbol: s.displaySymbol || displaySymbol(s.symbol),
        };
      });
    }

    // Fallback client computation
    const symbolMap = new Map<string, any>();
    for (const summary of this.summaries()) {
      const sym = summary.symbol;
      const priceData = this.pricesMap().get(sym);
      const currency = summary.currency;
      const investedCost = this.cx(summary.totalCost, currency);
      let currentValue = 0;
      if (priceData && priceData.price > 0) {
        currentValue = this.cx(summary.totalShares * priceData.price, priceData.currency);
      } else {
        currentValue = this.cx(summary.totalShares * summary.averageCost, currency);
      }

      symbolMap.set(sym, {
        symbol: sym,
        displaySymbol: displaySymbol(sym),
        name: resolveSymbolName(sym, this.pricesMap()),
        assetType: getAssetType(summary.assetType || '', sym),
        assetTypeLabel: getAssetTypeLabel(getAssetType(summary.assetType || '', sym)),
        color: getSymbolColor(sym),
        status: 'OPEN',
        investedCost,
        currentValue,
        realizedPL: 0,
        unrealizedPL: currentValue - investedCost,
        hasPrice: !!priceData
      });
    }

    const start = this.startDate();
    const end = this.endDate();
    for (const closed of this.closedSummaries()) {
      const sym = closed.symbol;
      const currency = closed.currency;
      let realizedPL = 0;
      let closedInvested = 0;
      let closedProceeds = 0;

      for (const lot of closed.lots) {
        if ((!start || !end) || (lot.closeDate >= start && lot.closeDate <= end)) {
          const lotCurrency = lot.currency || currency;
          realizedPL += this.cx(lot.realizedPL, lotCurrency);
          closedInvested += this.cx(lot.totalCost, lotCurrency);
          closedProceeds += this.cx(lot.totalProceeds || (lot.totalCost + lot.realizedPL), lotCurrency);
        }
      }

      if (symbolMap.has(sym)) {
        const existing = symbolMap.get(sym);
        existing.status = 'BOTH';
        existing.realizedPL += realizedPL;
        existing.investedCost += closedInvested;
        existing.currentValue += closedProceeds;
      } else {
        symbolMap.set(sym, {
          symbol: sym,
          displaySymbol: displaySymbol(sym),
          name: resolveSymbolName(sym, this.pricesMap()),
          assetType: getAssetType(closed.assetType || '', sym),
          assetTypeLabel: getAssetTypeLabel(getAssetType(closed.assetType || '', sym)),
          color: getSymbolColor(sym),
          status: 'CLOSED',
          investedCost: closedInvested,
          currentValue: closedProceeds,
          realizedPL: realizedPL,
          unrealizedPL: 0,
          hasPrice: false
        });
      }
    }

    return Array.from(symbolMap.values()).map(s => {
      const totalReturn = s.realizedPL + s.unrealizedPL;
      const totalReturnPercent = s.investedCost > 0 ? (totalReturn / s.investedCost) * 100 : 0;
      return { ...s, totalReturnAmount: totalReturn, totalReturn, totalReturnPercent };
    });
  });

  symbolPerformance = computed(() => {
    let result = [...this.rawSymbolPerformance()];

    const search = this.searchQuery().toLowerCase().trim();
    const assetType = this.assetTypeFilter();
    const status = this.statusFilter();

    if (search) {
      result = result.filter(
        (s) =>
          s.symbol.toLowerCase().includes(search) ||
          s.displaySymbol.toLowerCase().includes(search) ||
          s.name.toLowerCase().includes(search) ||
          s.assetTypeLabel.toLowerCase().includes(search)
      );
    }

    if (assetType !== 'all') {
      result = result.filter((s) => s.assetType === assetType);
    }

    if (status !== 'all') {
      if (status === 'open') {
        result = result.filter((s) => s.status === 'OPEN' || s.status === 'BOTH');
      } else if (status === 'closed') {
        result = result.filter((s) => s.status === 'CLOSED' || s.status === 'BOTH');
      }
    }

    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      let valA = a[field as keyof typeof a];
      let valB = b[field as keyof typeof b];

      if (field === 'symbol') {
        return a.symbol.localeCompare(b.symbol) * dir;
      }

      return ((valA as number) - (valB as number)) * dir;
    });

    return result;
  });

  filteredSymbolPerformance = computed(() => {
    const all = this.symbolPerformance();
    return this.showAllSymbols() ? all : all.slice(0, 10);
  });

  topGainers = computed(() => {
    return [...this.symbolPerformance()]
      .filter((s) => s.totalReturnPercent > 0)
      .sort((a, b) => b.totalReturnPercent - a.totalReturnPercent)
      .slice(0, 5);
  });

  topLosers = computed(() => {
    return [...this.symbolPerformance()]
      .filter((s) => s.totalReturnPercent < 0)
      .sort((a, b) => a.totalReturnPercent - b.totalReturnPercent)
      .slice(0, 5);
  });

  portfolioSummary = computed(() => {
    const perf = this.serverPerformance();
    if (perf && perf.summary && (perf.summary.totalInvested > 0 || perf.summary.totalValue > 0)) {
      return {
        totalInvested: this.cx(perf.summary.totalInvested, perf.currency),
        totalCurrentValue: this.cx(perf.summary.totalValue, perf.currency),
        openInvested: this.cx(perf.summary.openInvested, perf.currency),
        closedInvested: this.cx(perf.summary.closedInvested, perf.currency),
        totalUnrealizedPL: this.cx(perf.summary.totalUnrealizedPL, perf.currency),
        totalUnrealizedPLPercent: perf.summary.totalUnrealizedPLPercent,
        totalRealizedPL: this.cx(perf.summary.totalRealizedPL, perf.currency),
        totalRealizedPLPercent: perf.summary.totalRealizedPLPercent,
        totalReturn: this.cx(perf.summary.totalReturn, perf.currency),
        totalReturnPercent: perf.summary.totalReturnPercent,
      };
    }

    // Fallback client computation
    let openInvested = 0;
    let openValue = 0;
    let closedInvested = 0;
    let closedRealized = 0;

    for (const summary of this.summaries()) {
      const priceData = this.pricesMap().get(summary.symbol);
      const invested = this.cx(summary.totalCost, summary.currency);
      let value = 0;
      if (priceData && priceData.price > 0) {
        value = this.cx(summary.totalShares * priceData.price, priceData.currency);
      } else {
        value = this.cx(summary.totalShares * summary.averageCost, summary.currency);
      }
      openInvested += invested;
      openValue += value;
    }

    const totalUnrealizedPL = openValue - openInvested;
    const totalUnrealizedPLPercent = openInvested > 0 ? (totalUnrealizedPL / openInvested) * 100 : 0;

    const start = this.startDate();
    const end = this.endDate();
    for (const closed of this.closedSummaries()) {
      for (const lot of closed.lots) {
        if ((!start || !end) || (lot.closeDate >= start && lot.closeDate <= end)) {
          const lotCurrency = lot.currency || closed.currency;
          closedInvested += this.cx(lot.totalCost, lotCurrency);
          closedRealized += this.cx(lot.realizedPL, lotCurrency);
        }
      }
    }

    const totalRealizedPL = closedRealized;
    const totalRealizedPLPercent = closedInvested > 0 ? (totalRealizedPL / closedInvested) * 100 : 0;
    const totalInvested = openInvested + closedInvested;
    const totalReturn = totalRealizedPL + totalUnrealizedPL;
    const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue: openValue,
      openInvested,
      closedInvested,
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      totalRealizedPL,
      totalRealizedPLPercent,
      totalReturn,
      totalReturnPercent
    };
  });

  getMaxAbsReturnPercent = computed(() => {
    let max = 0;
    for (const t of this.assetTypePerformance()) {
      if (Math.abs(t.totalReturnPercent) > max) {
        max = Math.abs(t.totalReturnPercent);
      }
    }
    return max === 0 ? 1 : max;
  });

  isSearchFocused = signal<boolean>(false);
  isSearchDropdownOpen = signal<boolean>(false);
  searchActiveIndex = signal<number>(-1);

  readonly autocompleteSuggestions = computed(() => {
    const query = this.searchQuery().trim().toUpperCase();
    const all = this.rawSymbolPerformance();

    if (!query) {
      return all.slice(0, 8);
    }

    const matches = all.filter(
      (s) =>
        s.symbol.toUpperCase().includes(query) ||
        s.displaySymbol.toUpperCase().includes(query) ||
        s.name.toUpperCase().includes(query) ||
        s.assetTypeLabel.toUpperCase().includes(query)
    );

    matches.sort((a, b) => {
      const aSym = a.symbol.toUpperCase();
      const bSym = b.symbol.toUpperCase();
      const aDisp = a.displaySymbol.toUpperCase();
      const bDisp = b.displaySymbol.toUpperCase();

      const aExact = aSym === query || aDisp === query;
      const bExact = bSym === query || bDisp === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = aSym.startsWith(query) || aDisp.startsWith(query);
      const bStarts = bSym.startsWith(query) || bDisp.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    });

    return matches.slice(0, 8);
  });

  onDateRangeChange(range: DateRange): void {
    this.startDate.set(range.startDate);
    this.endDate.set(range.endDate);
  }

  setSort(field: string): void {
    if (this.sortField() === field) {
      this.toggleSortDirection();
    } else {
      this.sortField.set(field);
      this.sortDirection.set('desc');
    }
  }

  toggleSortDirection(): void {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  setAssetTypeFilter(type: string): void {
    this.assetTypeFilter.set(type);
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.isSearchDropdownOpen.set(true);
    this.searchActiveIndex.set(-1);
  }

  onSearchFocus(): void {
    this.isSearchFocused.set(true);
    this.isSearchDropdownOpen.set(true);
  }

  closeSearchDropdown(): void {
    this.isSearchDropdownOpen.set(false);
    this.isSearchFocused.set(false);
    this.searchActiveIndex.set(-1);
  }

  clearSearch(inputEl?: HTMLInputElement): void {
    this.searchQuery.set('');
    this.searchActiveIndex.set(-1);
    this.isSearchDropdownOpen.set(true);
    if (inputEl) {
      inputEl.focus();
    }
  }

  selectAutocompleteItem(item: { symbol: string; displaySymbol: string }): void {
    this.searchQuery.set(item.displaySymbol || item.symbol);
    this.closeSearchDropdown();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const suggestions = this.autocompleteSuggestions();
    const isOpen = this.isSearchDropdownOpen();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        this.isSearchDropdownOpen.set(true);
        this.searchActiveIndex.set(0);
        return;
      }
      if (suggestions.length > 0) {
        const nextIndex = (this.searchActiveIndex() + 1) % suggestions.length;
        this.searchActiveIndex.set(nextIndex);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        this.isSearchDropdownOpen.set(true);
        this.searchActiveIndex.set(suggestions.length - 1);
        return;
      }
      if (suggestions.length > 0) {
        const nextIndex =
          this.searchActiveIndex() <= 0 ? suggestions.length - 1 : this.searchActiveIndex() - 1;
        this.searchActiveIndex.set(nextIndex);
      }
    } else if (event.key === 'Enter') {
      if (isOpen && this.searchActiveIndex() >= 0 && this.searchActiveIndex() < suggestions.length) {
        event.preventDefault();
        this.selectAutocompleteItem(suggestions[this.searchActiveIndex()]);
      } else {
        this.closeSearchDropdown();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSearchDropdown();
    }
  }

  toggleShowAll(): void {
    this.showAllSymbols.set(!this.showAllSymbols());
  }
}
