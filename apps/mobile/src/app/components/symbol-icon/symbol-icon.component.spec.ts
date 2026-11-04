import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SymbolIconComponent } from './symbol-icon.component';
import { clearLogoCache, markLogoUrlFailed } from '../../utils/symbol-icon.utils';

describe('SymbolIconComponent', () => {
  let component: SymbolIconComponent;
  let fixture: ComponentFixture<SymbolIconComponent>;

  beforeEach(async () => {
    clearLogoCache();
    await TestBed.configureTestingModule({
      imports: [SymbolIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SymbolIconComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.componentRef.setInput('symbol', 'AAPL');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders mutual fund placeholder SVG for mutual funds', () => {
    fixture.componentRef.setInput('symbol', 'SCBBLN.FUND');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const fundPlaceholder = compiled.querySelector('.fund-placeholder');
    const img = compiled.querySelector('img');

    expect(fundPlaceholder).toBeTruthy();
    expect(img).toBeNull();
  });

  it('renders image element for stocks', () => {
    fixture.componentRef.setInput('symbol', 'AAPL');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');

    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toContain('parqet.com');
  });

  it('renders image element for crypto', () => {
    fixture.componentRef.setInput('symbol', 'BTC.CRYPTO');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');

    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toContain('coincap.io');
  });

  it('falls back to monogram on image error', () => {
    fixture.componentRef.setInput('symbol', 'AAPL');
    fixture.detectChanges();

    component.onImageError();
    // Second error for secondary fallback
    component.onImageError();
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const monogram = compiled.querySelector('.symbol-monogram');
    expect(monogram).toBeTruthy();
    expect(monogram?.textContent?.trim()).toBe('AA');
  });

  it('skips image if URL was already marked as failed', () => {
    markLogoUrlFailed('https://assets.parqet.com/logos/symbol/AAPL?format=png');
    markLogoUrlFailed('https://financialmodelingprep.com/image-stock/AAPL.png');

    fixture.componentRef.setInput('symbol', 'AAPL');
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');
    expect(img).toBeNull();
  });

  it('adjusts pixel size based on size input', () => {
    fixture.componentRef.setInput('symbol', 'AAPL');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(component.pixelSize()).toBe(24);

    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    expect(component.pixelSize()).toBe(40);

    fixture.componentRef.setInput('size', 48);
    fixture.detectChanges();
    expect(component.pixelSize()).toBe(48);
  });

  it('applies circle or rounded shape class', () => {
    fixture.componentRef.setInput('symbol', 'AAPL');
    fixture.componentRef.setInput('shape', 'circle');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const wrapper = compiled.querySelector('.symbol-icon-wrapper');
    expect(wrapper?.classList.contains('shape-circle')).toBe(true);

    fixture.componentRef.setInput('shape', 'rounded');
    fixture.detectChanges();
    expect(wrapper?.classList.contains('shape-rounded')).toBe(true);
  });

  it('marks image as loaded on load event', () => {
    fixture.componentRef.setInput('symbol', 'AAPL');
    fixture.detectChanges();

    expect(component.isLoaded()).toBe(false);
    component.onImageLoad();
    fixture.detectChanges();

    expect(component.isLoaded()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');
    expect(img?.classList.contains('loaded')).toBe(true);
  });
});
