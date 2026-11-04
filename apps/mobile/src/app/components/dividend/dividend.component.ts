import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';
import {
  PortfolioDividendResponse,
  DividendRecord,
  AnnualDividendSummary,
  MonthlyDividendSummary,
  AssetTypeDividendSummary,
  SymbolDividendSummary,
  FundDividendDistribution,
} from '../../models/dividend.model';
import { DIVIDEND_ASSET_TYPES } from '../../config/asset.constants';
import { convertCurrency, getAssetColor } from '../../utils/format.utils';

@Component({
  selector: 'app-dividend',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, NgClass, SymbolIconComponent],
  templateUrl: './dividend.component.html',
  styleUrl: './dividend.component.css'
})
export class DividendComponent {
  data = input<PortfolioDividendResponse | null>(null);
  loading = input<boolean>(false);
  error = input<string | null>(null);
  displayCurrency = input<'USD' | 'THB'>('THB');
  exchangeRate = input<number>(1.0);

  // Formatting helpers passed from parent
  getSymbolColor = input.required<(symbol: string) => string>();
  getDisplaySymbol = input.required<(symbol: string) => string>();
  getSymbolName = input.required<(symbol: string) => string>();
  getAssetTypeClass = input.required<(type?: string, symbol?: string) => string>();
  getAssetTypeLabel = input.required<(type?: string, symbol?: string) => string>();
  readonly getAssetColor = getAssetColor;

  // Outputs
  refresh = output<void>();
  currencyChange = output<'USD' | 'THB'>();

  // State Filters
  readonly selectedYear = signal<string>('ALL'); // 'ALL' or '2026', '2025', etc.
  readonly selectedAssetType = signal<string>('all'); // 'all', 'us-stock', 'thai-stock', 'mutual-fund', 'bond'
  readonly searchQuery = signal<string>('');
  readonly sortField = signal<'netDividends' | 'yoc' | 'currentYield' | 'projected' | 'name'>('netDividends');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  // Drill-down Modal State for SEC Fund Distribution History
  readonly selectedFundDistributions = signal<{ symbol: string; name: string; distributions: FundDividendDistribution[] } | null>(null);

  // Drill-down Modal State for Related Holding Dividend Ledger
  readonly selectedHoldingLedger = signal<{
    symbol: string;
    displaySymbol: string;
    name: string;
    assetType: string;
    assetTypeLabel: string;
    currency: string;
    records: DividendRecord[];
    totalGross: number;
    totalNet: number;
    totalWht: number;
  } | null>(null);

  cx(amount: number, fromCurrency?: string): number {
    if (!amount || amount === 0) return 0;
    const target = this.displayCurrency();
    const orig = (fromCurrency || target).toUpperCase() === 'USDT' ? 'USD' : (fromCurrency || target).toUpperCase();
    if (orig === target) return amount;
    const rate = this.exchangeRate();
    if (rate <= 0) return amount;
    return convertCurrency(amount, orig, target, rate);
  }

  // Available Years
  readonly availableYears = computed(() => {
    const d = this.data();
    if (!d || !d.annualDividends) return [];
    return d.annualDividends.map(a => a.year.toString());
  });

  // Filtered Records based on Year & Asset Type
  readonly filteredRecords = computed(() => {
    const d = this.data();
    if (!d || !d.records) return [];

    let recs = d.records;
    const year = this.selectedYear();
    const at = this.selectedAssetType();
    const q = this.searchQuery().toLowerCase().trim();

    if (year !== 'ALL') {
      recs = recs.filter(r => r.date.startsWith(year));
    }
    if (at !== 'all') {
      recs = recs.filter(r => r.assetType === at);
    }
    if (q) {
      recs = recs.filter(r =>
        r.symbol.toLowerCase().includes(q) ||
        r.displaySymbol.toLowerCase().includes(q) ||
        this.getSymbolName()(r.symbol).toLowerCase().includes(q)
      );
    }

    return recs.map(r => ({
      ...r,
      convertedNetAmount: this.cx(r.netAmount, r.currency),
      convertedGrossAmount: this.cx(r.grossAmount, r.currency),
      convertedWithholdingTax: this.cx(r.withholdingTax, r.currency),
    }));
  });

  // Filtered Symbol Summaries for the Yield on Cost & Symbol Breakdown Table
  readonly filteredSymbolSummaries = computed(() => {
    const d = this.data();
    if (!d || !d.symbolSummaries) return [];

    const year = this.selectedYear();
    const at = this.selectedAssetType();
    const q = this.searchQuery().toLowerCase().trim();
    const recs = this.filteredRecords();

    // Map of symbol -> timeframe net dividends and gross dividends
    const symbolNetMap = new Map<string, number>();
    const symbolGrossMap = new Map<string, number>();
    for (const r of recs) {
      symbolNetMap.set(r.symbol, (symbolNetMap.get(r.symbol) || 0) + r.convertedNetAmount);
      symbolGrossMap.set(r.symbol, (symbolGrossMap.get(r.symbol) || 0) + r.convertedGrossAmount);
    }

    let list: SymbolDividendSummary[] = [];

    for (const s of d.symbolSummaries) {
      if (at !== 'all' && s.assetType !== at) {
        continue;
      }
      if (q) {
        const matchesQuery =
          s.symbol.toLowerCase().includes(q) ||
          s.displaySymbol.toLowerCase().includes(q) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          this.getSymbolName()(s.symbol).toLowerCase().includes(q);
        if (!matchesQuery) continue;
      }

      const convCost = this.cx(s.currentCostBasis || 0, d.currency);
      const convVal = this.cx(s.currentValue || 0, d.currency);
      const convProj = s.projectedAnnualIncome != null && s.projectedAnnualIncome > 0
        ? this.cx(s.projectedAnnualIncome, d.currency)
        : this.cx((s.currentShares || 0) * (s.trailingAnnualDPS || 0), s.currency);
      const convGross = this.cx(s.convertedGrossDividends ?? s.totalGrossDividends ?? 0, d.currency);
      const convNet = this.cx(s.convertedNetDividends ?? s.totalNetDividends ?? 0, d.currency);
      const convWht = this.cx(s.convertedWithholdingTax ?? s.totalWithholdingTax ?? 0, d.currency);
      const symYoc = convCost > 0 ? (convProj / convCost) * 100 : (s.yieldOnCostPercent || 0);
      const symYield = convVal > 0 ? (convProj / convVal) * 100 : (s.currentYieldPercent || 0);

      // If a specific year is selected, only show symbols that received dividends in that year
      if (year !== 'ALL') {
        const timeframeNet = symbolNetMap.get(s.symbol) || 0;
        if (timeframeNet <= 0) {
          continue;
        }
        list.push({
          ...s,
          currentCostBasis: convCost,
          currentValue: convVal,
          projectedAnnualIncome: convProj,
          yieldOnCostPercent: symYoc,
          currentYieldPercent: symYield,
          convertedNetDividends: timeframeNet,
          convertedGrossDividends: symbolGrossMap.get(s.symbol) || 0,
          convertedWithholdingTax: convWht,
        });
      } else {
        list.push({
          ...s,
          currentCostBasis: convCost,
          currentValue: convVal,
          projectedAnnualIncome: convProj,
          yieldOnCostPercent: symYoc,
          currentYieldPercent: symYield,
          convertedNetDividends: convNet,
          convertedGrossDividends: convGross,
          convertedWithholdingTax: convWht,
        });
      }
    }

    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (field === 'netDividends') {
        return (a.convertedNetDividends - b.convertedNetDividends) * dir;
      }
      if (field === 'yoc') {
        return (a.yieldOnCostPercent - b.yieldOnCostPercent) * dir;
      }
      if (field === 'currentYield') {
        return (a.currentYieldPercent - b.currentYieldPercent) * dir;
      }
      if (field === 'projected') {
        return (a.projectedAnnualIncome - b.projectedAnnualIncome) * dir;
      }
      if (field === 'name') {
        return a.displaySymbol.localeCompare(b.displaySymbol) * dir;
      }
      return 0;
    });

    return list;
  });

  // Dynamic Asset Type Summaries Filtered by Selected Year & Search
  readonly activeAssetTypeSummaries = computed<AssetTypeDividendSummary[]>(() => {
    const d = this.data();
    const recs = this.filteredRecords();
    const totalNet = this.activeNetTotal();

    const map: Record<string, { gross: number; net: number; wht: number; symbols: Set<string>; count: number }> =
      Object.fromEntries(
        DIVIDEND_ASSET_TYPES.map((at) => [
          at,
          { gross: 0, net: 0, wht: 0, symbols: new Set<string>(), count: 0 },
        ])
      );

    for (const r of recs) {
      if (map[r.assetType]) {
        map[r.assetType].gross += r.convertedGrossAmount;
        map[r.assetType].net += r.convertedNetAmount;
        map[r.assetType].wht += r.convertedWithholdingTax;
        map[r.assetType].symbols.add(r.symbol);
        map[r.assetType].count += 1;
      }
    }

    const backendAtMap = new Map<string, AssetTypeDividendSummary>();
    if (d?.assetTypeSummaries) {
      for (const ats of d.assetTypeSummaries) {
        backendAtMap.set(ats.assetType, ats);
      }
    }

    // Accumulate cost basis, current value, and forward projected income per asset type
    const costMap = new Map<string, number>();
    const valMap = new Map<string, number>();
    const projMap = new Map<string, number>();

    if (d?.symbolSummaries) {
      for (const s of d.symbolSummaries) {
        const at = s.assetType;
        const convCost = this.cx(s.currentCostBasis || 0, d.currency);
        const convVal = this.cx(s.currentValue || 0, d.currency);
        const convProj = s.projectedAnnualIncome != null && s.projectedAnnualIncome > 0
          ? this.cx(s.projectedAnnualIncome, d.currency)
          : this.cx((s.currentShares || 0) * (s.trailingAnnualDPS || 0), s.currency);
        costMap.set(at, (costMap.get(at) || 0) + convCost);
        valMap.set(at, (valMap.get(at) || 0) + convVal);
        projMap.set(at, (projMap.get(at) || 0) + convProj);
        if (map[at] && (s.currentShares || 0) > 0) {
          map[at].symbols.add(s.symbol);
        }
      }
    }

    return DIVIDEND_ASSET_TYPES.map((atKey) => {
      const bAt = backendAtMap.get(atKey);
      const totalCostBasis = costMap.has(atKey)
        ? costMap.get(atKey)!
        : (bAt?.totalCostBasis ? this.cx(bAt.totalCostBasis, d?.currency) : 0);
      const currentValue = valMap.has(atKey)
        ? valMap.get(atKey)!
        : (bAt?.currentValue ? this.cx(bAt.currentValue, d?.currency) : 0);
      const projectedAnnualDividends = projMap.has(atKey)
        ? projMap.get(atKey)!
        : (bAt?.projectedAnnualDividends ? this.cx(bAt.projectedAnnualDividends, d?.currency) : 0);
      const yieldOnCostPercent = totalCostBasis > 0
        ? (projectedAnnualDividends / totalCostBasis) * 100
        : (bAt?.yieldOnCostPercent || 0);
      const currentYieldPercent = currentValue > 0
        ? (projectedAnnualDividends / currentValue) * 100
        : (bAt?.currentYieldPercent || 0);

      return {
        assetType: atKey,
        assetTypeLabel: this.getAssetTypeLabel()(atKey),
        totalGrossDividends: map[atKey]?.gross || 0,
        totalNetDividends: map[atKey]?.net || 0,
        totalWithholdingTax: map[atKey]?.wht || 0,
        percentageOfTotal: totalNet > 0 && map[atKey] ? (map[atKey].net / totalNet) * 100 : 0,
        symbolCount: map[atKey]?.symbols.size || bAt?.symbolCount || 0,
        recordCount: map[atKey]?.count || 0,
        totalCostBasis,
        currentValue,
        projectedAnnualDividends,
        yieldOnCostPercent,
        currentYieldPercent,
      };
    });
  });

  // Filtered Monthly Summary for the Chart derived from filteredRecords
  readonly monthlyChartData = computed(() => {
    const recs = this.filteredRecords();
    if (recs.length === 0) return [];

    const monthMap = new Map<string, {
      yearMonth: string;
      netAmount: number;
      grossAmount: number;
      usAmount: number;
      thaiAmount: number;
      fundAmount: number;
      bondAmount: number;
      count: number;
    }>();

    for (const r of recs) {
      const ym = r.date.slice(0, 7);
      if (!monthMap.has(ym)) {
        monthMap.set(ym, {
          yearMonth: ym,
          netAmount: 0,
          grossAmount: 0,
          usAmount: 0,
          thaiAmount: 0,
          fundAmount: 0,
          bondAmount: 0,
          count: 0,
        });
      }
      const entry = monthMap.get(ym)!;
      entry.netAmount += r.convertedNetAmount;
      entry.grossAmount += r.convertedGrossAmount;
      entry.count += 1;
      if (r.assetType === 'us-stock') entry.usAmount += r.convertedNetAmount;
      else if (r.assetType === 'thai-stock') entry.thaiAmount += r.convertedNetAmount;
      else if (r.assetType === 'mutual-fund') entry.fundAmount += r.convertedNetAmount;
      else if (r.assetType === 'bond') entry.bondAmount += r.convertedNetAmount;
    }

    // Chronological order (oldest to newest)
    const sorted = Array.from(monthMap.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    const maxVal = Math.max(...sorted.map(m => m.netAmount), 1);

    return sorted.map(m => ({
      ...m,
      percentHeight: Math.max(12, Math.round((m.netAmount / maxVal) * 100)),
      usPercent: m.netAmount > 0 ? (m.usAmount / m.netAmount) * 100 : 0,
      thaiPercent: m.netAmount > 0 ? (m.thaiAmount / m.netAmount) * 100 : 0,
      fundPercent: m.netAmount > 0 ? (m.fundAmount / m.netAmount) * 100 : 0,
      bondPercent: m.netAmount > 0 ? (m.bondAmount / m.netAmount) * 100 : 0,
    }));
  });

  // Pagination State for Ledger
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly totalRecords = computed<number>(() => this.filteredRecords().length);
  readonly totalPages = computed<number>(() => Math.max(1, Math.ceil(this.totalRecords() / this.pageSize())));

  readonly paginatedRecords = computed<DividendRecord[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRecords().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed<number>(() => (this.totalRecords() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  readonly endIndex = computed<number>(() => Math.min(this.currentPage() * this.pageSize(), this.totalRecords()));

  readonly displayedPageNumbers = computed<(number | string)[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  });

  // Annual Totals Computed for Active Filter
  readonly activeNetTotal = computed(() => {
    const recs = this.filteredRecords();
    return recs.reduce((acc, r) => acc + r.convertedNetAmount, 0);
  });

  readonly activeGrossTotal = computed(() => {
    const recs = this.filteredRecords();
    return recs.reduce((acc, r) => acc + r.convertedGrossAmount, 0);
  });

  readonly activeWhtTotal = computed(() => {
    const recs = this.filteredRecords();
    return recs.reduce((acc, r) => acc + r.convertedWithholdingTax, 0);
  });

  // Dynamic Global Projected & Yield Metrics Filtered by Active Asset Type
  readonly activeProjectedAnnualDividends = computed<number>(() => {
    const list = this.filteredSymbolSummaries();
    return list.reduce((acc, s) => acc + (s.projectedAnnualIncome || 0), 0);
  });

  readonly activeYieldOnCost = computed<number>(() => {
    const at = this.selectedAssetType();
    const list = this.filteredSymbolSummaries();
    const totalCost = list.reduce((acc, s) => acc + (s.currentCostBasis || 0), 0);
    const totalProj = list.reduce((acc, s) => acc + (s.projectedAnnualIncome || 0), 0);
    if (at === 'all' && !this.searchQuery().trim() && this.selectedYear() === 'ALL') {
      return this.data()?.portfolioYieldOnCost || (totalCost > 0 ? (totalProj / totalCost) * 100 : 0);
    }
    return totalCost > 0 ? (totalProj / totalCost) * 100 : 0;
  });

  readonly activeMarketYield = computed<number>(() => {
    const at = this.selectedAssetType();
    const list = this.filteredSymbolSummaries();
    const totalVal = list.reduce((acc, s) => acc + (s.currentValue || 0), 0);
    const totalProj = list.reduce((acc, s) => acc + (s.projectedAnnualIncome || 0), 0);
    if (at === 'all' && !this.searchQuery().trim() && this.selectedYear() === 'ALL') {
      return this.data()?.portfolioDividendYield || (totalVal > 0 ? (totalProj / totalVal) * 100 : 0);
    }
    return totalVal > 0 ? (totalProj / totalVal) * 100 : 0;
  });

  readonly activeEffectiveTaxRate = computed<number>(() => {
    const gross = this.activeGrossTotal();
    const wht = this.activeWhtTotal();
    return gross > 0 ? (wht / gross) * 100 : (this.data()?.effectiveTaxRate || 0);
  });

  // Autocomplete State & Suggestions
  readonly isAutocompleteOpen = signal<boolean>(false);
  readonly highlightedIndex = signal<number>(-1);

  readonly autocompleteSuggestions = computed<{
    symbol: string;
    displaySymbol: string;
    name: string;
    assetType: string;
    assetTypeLabel: string;
    trailingDPS: number;
    currency: string;
  }[]>(() => {
    const d = this.data();
    if (!d || !d.symbolSummaries) return [];

    const query = this.searchQuery().trim().toLowerCase();
    const at = this.selectedAssetType();

    let list = d.symbolSummaries;
    if (at !== 'all') {
      list = list.filter(s => s.assetType === at);
    }

    if (!query) {
      return list.slice(0, 6).map(s => ({
        symbol: s.symbol,
        displaySymbol: s.displaySymbol || this.getDisplaySymbol()(s.symbol),
        name: s.name || this.getSymbolName()(s.symbol),
        assetType: s.assetType,
        assetTypeLabel: this.getAssetTypeLabel()(s.assetType, s.symbol),
        trailingDPS: s.trailingAnnualDPS,
        currency: s.currency,
      }));
    }

    return list
      .filter(s => {
        const sym = s.symbol.toLowerCase();
        const disp = (s.displaySymbol || this.getDisplaySymbol()(s.symbol)).toLowerCase();
        const name = (s.name || this.getSymbolName()(s.symbol)).toLowerCase();
        return sym.includes(query) || disp.includes(query) || name.includes(query);
      })
      .slice(0, 8)
      .map(s => ({
        symbol: s.symbol,
        displaySymbol: s.displaySymbol || this.getDisplaySymbol()(s.symbol),
        name: s.name || this.getSymbolName()(s.symbol),
        assetType: s.assetType,
        assetTypeLabel: this.getAssetTypeLabel()(s.assetType, s.symbol),
        trailingDPS: s.trailingAnnualDPS,
        currency: s.currency,
      }));
  });

  setYear(year: string) {
    this.selectedYear.set(year);
    this.currentPage.set(1);
  }

  setAssetType(at: string) {
    this.selectedAssetType.set(at);
    this.currentPage.set(1);
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.isAutocompleteOpen.set(true);
    this.highlightedIndex.set(-1);
    this.currentPage.set(1);
  }

  onSearchFocus() {
    this.isAutocompleteOpen.set(true);
    this.highlightedIndex.set(-1);
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isAutocompleteOpen.set(false);
      this.highlightedIndex.set(-1);
    }, 200);
  }

  onSearchKeyDown(event: KeyboardEvent) {
    const suggestions = this.autocompleteSuggestions();
    if (!this.isAutocompleteOpen() || suggestions.length === 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.isAutocompleteOpen.set(true);
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.update(i => (i + 1 < suggestions.length ? i + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.update(i => (i - 1 >= 0 ? i - 1 : suggestions.length - 1));
    } else if (event.key === 'Enter') {
      const idx = this.highlightedIndex();
      if (idx >= 0 && idx < suggestions.length) {
        event.preventDefault();
        this.selectAutocomplete(suggestions[idx]);
      }
    } else if (event.key === 'Escape') {
      this.isAutocompleteOpen.set(false);
      this.highlightedIndex.set(-1);
    }
  }

  selectAutocomplete(item: { displaySymbol: string; symbol: string }) {
    this.searchQuery.set(item.displaySymbol || item.symbol);
    this.isAutocompleteOpen.set(false);
    this.highlightedIndex.set(-1);
    this.currentPage.set(1);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.isAutocompleteOpen.set(false);
    this.highlightedIndex.set(-1);
    this.currentPage.set(1);
  }

  onSearchChange(event: Event) {
    this.onSearchInput(event);
  }

  setPage(page: number | string): void {
    const p = typeof page === 'string' ? Number(page) : page;
    if (!isNaN(p) && p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  setPageSize(size: number | string): void {
    const numSize = Number(size);
    if (this.pageSizeOptions.includes(numSize)) {
      this.pageSize.set(numSize);
      this.currentPage.set(1);
    }
  }

  onPageSizeChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.setPageSize(val);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.setPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.setPage(this.currentPage() - 1);
    }
  }

  firstPage(): void {
    this.setPage(1);
  }

  lastPage(): void {
    this.setPage(this.totalPages());
  }

  setSort(field: 'netDividends' | 'yoc' | 'currentYield' | 'projected' | 'name') {
    if (this.sortField() === field) {
      this.sortDirection.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set('desc');
    }
  }

  openFundDistributions(sym: SymbolDividendSummary) {
    this.selectedFundDistributions.set({
      symbol: sym.symbol,
      name: sym.name || this.getSymbolName()(sym.symbol),
      distributions: sym.recentDistributions || []
    });
  }

  closeFundDistributions() {
    this.selectedFundDistributions.set(null);
  }

  getHoldingRecords(symbol: string): DividendRecord[] {
    const d = this.data();
    if (!d || !d.records) return [];
    return d.records
      .filter((r) => r.symbol === symbol)
      .map((r) => ({
        ...r,
        convertedNetAmount: this.cx(r.netAmount, r.currency),
        convertedGrossAmount: this.cx(r.grossAmount, r.currency),
        convertedWithholdingTax: this.cx(r.withholdingTax, r.currency),
      }));
  }

  getHoldingRecordsCount(symbol: string): number {
    return this.getHoldingRecords(symbol).length;
  }

  openHoldingLedger(s: SymbolDividendSummary) {
    const recs = this.getHoldingRecords(s.symbol);
    const totalGross = recs.reduce((acc, r) => acc + r.convertedGrossAmount, 0);
    const totalNet = recs.reduce((acc, r) => acc + r.convertedNetAmount, 0);
    const totalWht = recs.reduce((acc, r) => acc + r.convertedWithholdingTax, 0);

    this.selectedHoldingLedger.set({
      symbol: s.symbol,
      displaySymbol: s.displaySymbol || this.getDisplaySymbol()(s.symbol),
      name: s.name || this.getSymbolName()(s.symbol),
      assetType: s.assetType,
      assetTypeLabel: this.getAssetTypeLabel()(s.assetType, s.symbol),
      currency: s.currency,
      records: [...recs].sort((a, b) => b.date.localeCompare(a.date)),
      totalGross,
      totalNet,
      totalWht
    });
  }

  closeHoldingLedger() {
    this.selectedHoldingLedger.set(null);
  }
}
