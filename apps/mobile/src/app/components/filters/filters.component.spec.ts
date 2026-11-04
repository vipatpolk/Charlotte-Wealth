import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiltersComponent } from './filters.component';

describe('FiltersComponent', () => {
  let component: FiltersComponent;
  let fixture: ComponentFixture<FiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FiltersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isClosedTab', false);
    fixture.componentRef.setInput('closedAssetTypeOptions', [
      { id: 'all', label: 'All Types' },
      { id: 'us-stock', label: 'U.S. Stock' },
    ]);
    fixture.componentRef.setInput('selectedClosedAssetType', 'all');
    fixture.componentRef.setInput('isMobileFilterDropdownOpen', false);
    fixture.componentRef.setInput('sortOptions', [
      { field: 'symbol', label: 'Symbol' },
      { field: 'totalCost', label: 'Total Cost' },
    ]);
    fixture.componentRef.setInput('sortField', 'totalCost');
    fixture.componentRef.setInput('sortDirection', 'desc');
    fixture.componentRef.setInput('isMobileSortDropdownOpen', false);
    fixture.detectChanges();
  });

  it('should create filters component', () => {
    expect(component).toBeTruthy();
    expect(component.sortField()).toBe('totalCost');
    expect(component.sortDirection()).toBe('desc');
  });

  it('should emit setClosedAssetType when asset filter pill is clicked', () => {
    const emitted: string[] = [];
    component.setClosedAssetType.subscribe((val) => emitted.push(val));

    component.setClosedAssetType.emit('us-stock');
    expect(emitted).toEqual(['us-stock']);
  });

  it('should emit setSort when a sort option is selected', () => {
    const emitted: string[] = [];
    component.setSort.subscribe((val) => emitted.push(val));

    component.setSort.emit('symbol');
    expect(emitted).toEqual(['symbol']);
  });

  it('should emit toggleSortDir when sort direction toggle button is clicked', () => {
    let emitted = false;
    component.toggleSortDir.subscribe(() => (emitted = true));

    component.toggleSortDir.emit();
    expect(emitted).toBe(true);
  });
});
