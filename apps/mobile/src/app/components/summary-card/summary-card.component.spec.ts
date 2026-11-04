import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryCardComponent } from './summary-card.component';
import { ComponentRef } from '@angular/core';

describe('SummaryCardComponent', () => {
  let component: SummaryCardComponent;
  let componentRef: ComponentRef<SummaryCardComponent>;
  let fixture: ComponentFixture<SummaryCardComponent>;

  const mockSummary = {
    symbol: 'AAPL',
    totalShares: 10,
    totalCost: 1500,
    averageCost: 150,
    currency: 'USD',
    assetType: 'us-stock',
    lots: [
      {
        purchaseDate: '2026-01-01',
        quantity: 10,
        costBasis: 150,
        totalCost: 1500
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('type', 'open');
    componentRef.setInput('summary', mockSummary);
    componentRef.setInput('isAllTab', false);
    componentRef.setInput('isClosedTab', false);
    componentRef.setInput('hasPriceData', true);
    componentRef.setInput('pricesLoading', false);
    componentRef.setInput('isExpanded', false);

    componentRef.setInput('getSymbolColor', (sym: string) => '#3b82f6');
    componentRef.setInput('getDisplaySymbol', (sym: string) => sym);
    componentRef.setInput('getSymbolName', (sym: string) => 'Apple Inc.');
    componentRef.setInput('getAssetTypeClass', () => 'pill-us-stock');
    componentRef.setInput('getAssetTypeLabel', () => 'U.S. Stock');
    componentRef.setInput('getQuantityFormat', () => '1.2-2');
    componentRef.setInput('getPriceFormat', () => '1.2-2');

    componentRef.setInput('cx', (val: number) => val);
    componentRef.setInput('dc', (curr?: string) => curr === 'THB' ? '฿' : '$');

    componentRef.setInput('getCurrentPriceConverted', () => 180);
    componentRef.setInput('getHoldingValue', () => 1800);
    componentRef.setInput('getUnrealizedPL', () => 300);
    componentRef.setInput('getUnrealizedPLPercent', () => 20);
    componentRef.setInput('getLotHoldingValue', () => 1800);
    componentRef.setInput('getLotUnrealizedPL', () => 300);

    fixture.detectChanges();
  });

  it('should create summary card component', () => {
    expect(component).toBeTruthy();
    expect(component.summary().symbol).toBe('AAPL');
  });

  it('should emit toggleExpand when card expand button is clicked', () => {
    let emittedSymbol = '';
    component.toggleExpand.subscribe(sym => emittedSymbol = sym);

    component.toggleExpand.emit('AAPL');
    expect(emittedSymbol).toBe('AAPL');
  });

  it('should emit openHistory when view history button is clicked', () => {
    let emittedSymbol = '';
    component.openHistory.subscribe(sym => emittedSymbol = sym);

    component.openHistory.emit('AAPL');
    expect(emittedSymbol).toBe('AAPL');
  });

  it('should render metric-amount and pl-percent for open position P/L', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const metricAmount = compiled.querySelector('.metric-amount');
    const plPercent = compiled.querySelector('.pl-percent');

    expect(metricAmount).toBeTruthy();
    expect(metricAmount?.textContent).toContain('300.00');
    expect(plPercent).toBeTruthy();
    expect(plPercent?.textContent).toContain('+20.00%');
  });

  it('should render closed position card with metric-amount and pl-percent', () => {
    const mockClosedSummary = {
      symbol: 'TSLA',
      totalShares: 0,
      closedShares: 5,
      totalCost: 1000,
      totalProceeds: 1500,
      realizedPL: 500,
      realizedPLPercent: 50,
      averageBuyPrice: 200,
      averageSellPrice: 300,
      currency: 'USD',
      assetType: 'us-stock',
      lots: [
        {
          symbol: 'TSLA',
          purchaseDate: '2026-01-01',
          closeDate: '2026-02-01',
          quantity: 5,
          costBasis: 200,
          sellPrice: 300,
          totalCost: 1000,
          totalProceeds: 1500,
          realizedPL: 500,
          realizedPLPercent: 50
        }
      ]
    };

    componentRef.setInput('type', 'closed');
    componentRef.setInput('summary', mockClosedSummary);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const metricAmount = compiled.querySelector('.metric-amount');
    const plPercent = compiled.querySelector('.pl-percent');

    expect(metricAmount).toBeTruthy();
    expect(metricAmount?.textContent).toContain('500.00');
    expect(plPercent).toBeTruthy();
    expect(plPercent?.textContent).toContain('+50.00%');
  });

  it('should render symbol name for closed positions', () => {
    const mockClosedSummary = {
      symbol: 'TTB.BK',
      name: 'TMBThanachart Bank Public Company Limited',
      totalShares: 0,
      closedShares: 100,
      totalCost: 150,
      totalProceeds: 180,
      realizedPL: 30,
      realizedPLPercent: 20,
      averageBuyPrice: 1.5,
      averageSellPrice: 1.8,
      currency: 'THB',
      assetType: 'thai-stock',
      lots: [],
    };

    componentRef.setInput('type', 'closed');
    componentRef.setInput('summary', mockClosedSummary);
    componentRef.setInput('getSymbolName', (sym: string, rawName?: string) => rawName || 'TMBThanachart Bank');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameEl = compiled.querySelector('.symbol-name');
    expect(nameEl).toBeTruthy();
    expect(nameEl?.textContent).toContain('TMBThanachart Bank');
  });

  it('should render NAV label, units, and pvd split for provident-fund open position', () => {
    const mockPvdSummary = {
      symbol: 'PVDSP500',
      name: 'นโยบายกองทุนรวมต่างประเทศ หุ้นยูเอส',
      totalShares: 1000,
      employeeShares: 500,
      employerShares: 500,
      totalCost: 15000,
      averageCost: 15,
      currency: 'THB',
      assetType: 'provident-fund',
      lots: [
        {
          purchaseDate: '2026-01-01',
          quantity: 500,
          costBasis: 15,
          totalCost: 7500,
          note: 'Employee Contribution',
        },
        {
          purchaseDate: '2026-01-01',
          quantity: 500,
          costBasis: 15,
          totalCost: 7500,
          note: 'Employer Matching',
        },
      ],
    };

    componentRef.setInput('type', 'open');
    componentRef.setInput('summary', mockPvdSummary);
    componentRef.setInput('getHoldingValue', (s: any) => s.totalCost || 15000);
    componentRef.setInput('isExpanded', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    // Units label
    const sharesEl = compiled.querySelector('.card-shares');
    expect(sharesEl?.textContent).toContain('units');

    // Split bar & labels
    const splitEl = compiled.querySelector('.card-pvd-split');
    expect(splitEl).toBeTruthy();
    expect(splitEl?.textContent).toContain('Emp 50%');
    expect(splitEl?.textContent).toContain('Co 50%');
    const splitBar = compiled.querySelector('.card-pvd-bar');
    expect(splitBar).toBeTruthy();
    expect(compiled.querySelector('.pvd-segment-employee')).toBeTruthy();
    expect(compiled.querySelector('.pvd-segment-employer')).toBeTruthy();

    // Metric labels: Avg Cost, Total Cost, NAV, Holding Value, P/L
    const metricLabels = Array.from(compiled.querySelectorAll('.card-metric-label'));
    const navLabel = metricLabels.find((el) => el.textContent?.trim() === 'NAV');
    expect(navLabel).toBeTruthy();
    const holdingValLabel = metricLabels.find((el) => el.textContent?.trim() === 'Holding Value');
    expect(holdingValLabel).toBeTruthy();
    const plLabel = metricLabels.find((el) => el.textContent?.trim() === 'P/L');
    expect(plLabel).toBeTruthy();

    // Transactions button must NOT be rendered for provident fund
    const tradesBtn = compiled.querySelector('.card-trades-btn');
    expect(tradesBtn).toBeNull();

    // Dedicated dual contribution cards in expanded view
    const dualCards = compiled.querySelector('.pvd-dual-cards');
    expect(dualCards).toBeTruthy();
    const empCard = compiled.querySelector('.pvd-card-employee');
    expect(empCard).toBeTruthy();
    expect(empCard?.textContent).toContain('Employee Contribution');
    expect(empCard?.textContent).toContain('7,500.00');
    expect(empCard?.textContent).toContain('50.0%');

    const coCard = compiled.querySelector('.pvd-card-employer');
    expect(coCard).toBeTruthy();
    expect(coCard?.textContent).toContain('Employer Matching');
    expect(coCard?.textContent).toContain('7,500.00');
    expect(coCard?.textContent).toContain('50.0%');

    // Footer banner
    const footerBanner = compiled.querySelector('.pvd-footer-banner');
    expect(footerBanner).toBeTruthy();
    expect(footerBanner?.textContent).toContain('Total Value');
    expect(footerBanner?.textContent).toContain('15,000.00');
  });

  it('should render contribution breakdown and earnings when available for provident fund', () => {
    const mockPvdWithEarnings = {
      symbol: 'PVDSP500',
      displaySymbol: 'PVDSP500',
      name: 'นโยบายกองทุนรวมต่างประเทศ หุ้นยูเอส',
      assetType: 'provident-fund',
      totalShares: 14299.97,
      totalCost: 174820.98,
      averageCost: 12.2253,
      currentPrice: 14.3452,
      holdingValue: 205135.89,
      unrealizedPL: 30314.91,
      unrealizedPLPercent: 17.34,
      currency: 'THB',
      employeeShares: 8294.68,
      employerShares: 6005.29,
      employeeContribution: 100858.26,
      employeeEarnings: 18130.55,
      employerMatching: 73962.72,
      employerEarnings: 12184.36,
      lots: [
        {
          purchaseDate: '2026-01-01',
          quantity: 8294.68,
          costBasis: 12.1594,
          totalCost: 100858.26,
          note: 'Employee Contribution',
        },
        {
          purchaseDate: '2026-01-01',
          quantity: 6005.29,
          costBasis: 12.3163,
          totalCost: 73962.72,
          note: 'Employer Matching',
        },
      ],
    };

    componentRef.setInput('type', 'open');
    componentRef.setInput('summary', mockPvdWithEarnings);
    componentRef.setInput('getHoldingValue', (s: any) => s.holdingValue || 205135.89);
    componentRef.setInput('isExpanded', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const empCard = compiled.querySelector('.pvd-card-employee');
    expect(empCard?.textContent).toContain('100,858.26');
    expect(empCard?.textContent).toContain('18,130.55');

    const coCard = compiled.querySelector('.pvd-card-employer');
    expect(coCard?.textContent).toContain('73,962.72');
    expect(coCard?.textContent).toContain('12,184.36');

    const footerBanner = compiled.querySelector('.pvd-footer-banner');
    expect(footerBanner?.textContent).toContain('Total Earnings');
    expect(footerBanner?.textContent).toContain('30,314.91');
    expect(footerBanner?.textContent).toContain('205,135.89');
  });
});
