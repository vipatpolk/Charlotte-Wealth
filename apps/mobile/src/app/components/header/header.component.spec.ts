import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { ComponentRef } from '@angular/core';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let componentRef: ComponentRef<HeaderComponent>;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('loading', false);
    componentRef.setInput('error', null);
    componentRef.setInput('result', null);
    componentRef.setInput('hasRate', true);
    componentRef.setInput('exchangeRate', 35.0);
    componentRef.setInput('currentView', 'holdings');
    componentRef.setInput('displayCurrency', 'USD');
    componentRef.setInput('theme', 'dark');

    fixture.detectChanges();
  });

  it('should create header component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle mobile view dropdown state', () => {
    expect(component.isViewDropdownOpen()).toBe(false);
    component.toggleViewDropdown();
    expect(component.isViewDropdownOpen()).toBe(true);
  });

  it('should close side nav via closeSideNav method', () => {
    component.isViewDropdownOpen.set(true);
    component.closeSideNav();
    expect(component.isViewDropdownOpen()).toBe(false);
  });

  it('should close side nav on escape key press', () => {
    component.isViewDropdownOpen.set(true);
    component.onEscape();
    expect(component.isViewDropdownOpen()).toBe(false);
  });

  it('should emit viewChange when nav button is clicked in template', () => {
    componentRef.setInput('result', { totalSymbols: 5, totalLots: 12, error: null } as any);
    fixture.detectChanges();

    let emittedView = '';
    component.viewChange.subscribe((v) => (emittedView = v));

    const analyticsBtn = fixture.nativeElement.querySelector(
      '#view-toggle-analytics',
    ) as HTMLButtonElement;
    expect(analyticsBtn).toBeTruthy();
    analyticsBtn.click();
    expect(emittedView).toBe('analytics');
  });

  it('should emit viewChange when dashboard nav button is clicked', () => {
    componentRef.setInput('result', { totalSymbols: 5, totalLots: 12, error: null } as any);
    fixture.detectChanges();

    let emittedView = '';
    component.viewChange.subscribe((v) => (emittedView = v));

    const dashBtn = fixture.nativeElement.querySelector(
      '#view-toggle-dashboard',
    ) as HTMLButtonElement;
    expect(dashBtn).toBeTruthy();
    dashBtn.click();
    expect(emittedView).toBe('dashboard');
  });

  it('should emit viewChange output and close dropdown when selecting view', () => {
    let emittedView = '';
    component.viewChange.subscribe((v) => (emittedView = v));

    component.toggleViewDropdown();
    component.selectView('allocation');

    expect(emittedView).toBe('allocation');
    expect(component.isViewDropdownOpen()).toBe(false);
  });

  it('should emit viewChange output and close dropdown when selecting analytics view', () => {
    let emittedView = '';
    component.viewChange.subscribe((v) => (emittedView = v));

    component.toggleViewDropdown();
    component.selectView('analytics');

    expect(emittedView).toBe('analytics');
    expect(component.isViewDropdownOpen()).toBe(false);
  });

  it('should emit viewChange output and close dropdown when selecting performance view', () => {
    let emittedView = '';
    component.viewChange.subscribe((v) => (emittedView = v));

    component.toggleViewDropdown();
    component.selectView('performance');

    expect(emittedView).toBe('performance');
    expect(component.isViewDropdownOpen()).toBe(false);
  });

  it('should format currency sign correctly via dc helper', () => {
    expect(component.dc('USD')).toBe('USD');
  });

  it('should not render header-stats-wrapper in the DOM', () => {
    componentRef.setInput('result', { totalSymbols: 5, totalLots: 12, error: null } as any);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.header-stats-wrapper')).toBeNull();
  });

  it('should compute page-specific meta stats for holdings view', () => {
    componentRef.setInput('result', { totalSymbols: 5, totalLots: 12, error: null } as any);
    componentRef.setInput('currentView', 'holdings');
    fixture.detectChanges();

    expect(component.result()?.totalSymbols).toBe(5);
    expect(component.result()?.totalLots).toBe(12);
  });

  it('should compute page-specific meta stats for dividends view', () => {
    componentRef.setInput('result', { totalSymbols: 5, totalLots: 12, error: null } as any);
    componentRef.setInput('dividendData', {
      symbolSummaries: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }],
      records: [{ id: '1' }, { id: '2' }, { id: '3' }],
      portfolioYieldOnCost: 4.85,
    } as any);
    componentRef.setInput('currentView', 'dividends');
    fixture.detectChanges();

    expect(component.dividendPayingAssetsCount()).toBe(2);
    expect(component.dividendDistributionsCount()).toBe(3);
    expect(component.dividendYOC()).toBe(4.85);
  });

  it('should compute page-specific meta stats for allocation view', () => {
    componentRef.setInput('result', { totalSymbols: 5, totalLots: 12, error: null } as any);
    componentRef.setInput('portfolioData', {
      openPositions: [
        { symbol: 'AAPL', assetType: 'us-stock', unrealizedPL: 500 },
        { symbol: 'SCB.BK', assetType: 'thai-stock', unrealizedPL: -200 },
      ],
    } as any);
    componentRef.setInput('currentView', 'allocation');
    fixture.detectChanges();

    expect(component.distinctAssetClassesCount()).toBe(2);
    expect(component.openPositions().length).toBe(2);
  });

  it('should compute page-specific meta stats for transactions view', () => {
    componentRef.setInput('result', {
      totalSymbols: 5,
      totalLots: 12,
      rawTransactions: [{ id: 'tx-1' }, { id: 'tx-2' }, { id: 'tx-3' }, { id: 'tx-4' }],
      error: null,
    } as any);
    componentRef.setInput('currentView', 'transactions');
    fixture.detectChanges();

    expect(component.totalTransactionsCount()).toBe(4);
    expect(component.result()?.totalSymbols).toBe(5);
  });

  it('should compute page-specific meta stats for performance view', () => {
    componentRef.setInput('result', { totalSymbols: 5, totalLots: 12, error: null } as any);
    componentRef.setInput('portfolioData', {
      openPositions: [
        { symbol: 'AAPL', unrealizedPL: 500 },
        { symbol: 'NVDA', unrealizedPL: 1200 },
        { symbol: 'SCB.BK', unrealizedPL: -200 },
      ],
    } as any);
    componentRef.setInput('currentView', 'performance');
    fixture.detectChanges();

    expect(component.gainersCount()).toBe(2);
    expect(component.losersCount()).toBe(1);
  });

  it('should emit viewChange output and close dropdown when selecting tools view', () => {
    let emittedView = '';
    component.viewChange.subscribe((v) => (emittedView = v));

    component.toggleViewDropdown();
    component.selectView('tools');

    expect(emittedView).toBe('tools');
    expect(component.isViewDropdownOpen()).toBe(false);
  });

  it('should emit privacyChange output when privacy toggle button is clicked', () => {
    let privacyToggled = false;
    component.privacyChange.subscribe(() => (privacyToggled = true));

    const button = fixture.nativeElement.querySelector('#privacy-toggle-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();

    expect(privacyToggled).toBe(true);
  });

  it('should reflect privacy-active class when privacyMode is true', () => {
    componentRef.setInput('privacyMode', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('#privacy-toggle-btn') as HTMLButtonElement;
    expect(button.classList.contains('privacy-active')).toBe(true);
    expect(button.getAttribute('title')).toContain('Show sensitive');
  });
});
