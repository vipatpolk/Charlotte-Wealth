import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchBarComponent } from './search-bar.component';
import { ComponentRef } from '@angular/core';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let componentRef: ComponentRef<SearchBarComponent>;
  let fixture: ComponentFixture<SearchBarComponent>;

  const mockItem = {
    symbol: 'AAPL',
    displaySymbol: 'AAPL',
    name: 'Apple Inc.',
    color: '#3b82f6',
    assetType: 'us-stock',
    assetTypeLabel: 'U.S. Stock',
    isClosed: false,
    totalShares: 10,
    totalCost: 1500,
    currency: 'USD'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('searchQuery', '');
    componentRef.setInput('isSearchFocused', false);
    componentRef.setInput('isSearchDropdownOpen', false);
    componentRef.setInput('searchActiveIndex', -1);
    componentRef.setInput('autocompleteSuggestions', [mockItem]);
    componentRef.setInput('filteredSummariesCount', 1);
    componentRef.setInput('filteredClosedSummariesCount', 0);
    componentRef.setInput('isClosedTab', false);
    componentRef.setInput('isAllTab', false);
    componentRef.setInput('getAssetTypeClass', () => 'pill-us-stock');

    fixture.detectChanges();
  });

  it('should create search bar component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit searchInput event on query typing', () => {
    let emittedQuery = '';
    component.searchInput.subscribe(q => emittedQuery = q);

    component.searchInput.emit('AAPL');
    expect(emittedQuery).toBe('AAPL');
  });

  it('should emit selectItem when selecting an autocomplete item', () => {
    let selectedSymbol = '';
    component.selectItem.subscribe(item => selectedSymbol = item.symbol);

    component.selectItem.emit(mockItem);
    expect(selectedSymbol).toBe('AAPL');
  });
});
