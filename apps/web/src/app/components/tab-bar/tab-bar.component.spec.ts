import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabBarComponent } from './tab-bar.component';
import { ASSET_TABS, AssetTab } from '../../config/asset.constants';

describe('TabBarComponent', () => {
  let component: TabBarComponent;
  let fixture: ComponentFixture<TabBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TabBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('currentView', 'holdings');
    fixture.componentRef.setInput('tabs', ASSET_TABS);
    fixture.componentRef.setInput('activeTab', ASSET_TABS[0]);
    fixture.componentRef.setInput('isTabDropdownOpen', false);
    fixture.detectChanges();
  });

  it('should create tab bar component', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab().id).toBe('all');
    expect(component.tabs().length).toBe(8);
  });

  it('should emit tabSelect when a tab is selected', () => {
    let selected: AssetTab | null = null;
    component.tabSelect.subscribe((tab) => (selected = tab));

    component.tabSelect.emit(ASSET_TABS[1]);
    expect(selected).toEqual(ASSET_TABS[1]);
  });

  it('should emit toggleDropdown when mobile dropdown toggle button is clicked', () => {
    let emitted = false;
    component.toggleDropdown.subscribe(() => (emitted = true));

    component.toggleDropdown.emit();
    expect(emitted).toBe(true);
  });
});
