import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { SymbolAutocompleteItem } from '../../app';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SymbolIconComponent],
  templateUrl: './search-bar.component.html'
})
export class SearchBarComponent {
  searchQuery = input.required<string>();
  isSearchFocused = input.required<boolean>();
  isSearchDropdownOpen = input.required<boolean>();
  searchActiveIndex = input.required<number>();
  autocompleteSuggestions = input.required<SymbolAutocompleteItem[]>();
  filteredSummariesCount = input.required<number>();
  filteredClosedSummariesCount = input.required<number>();
  isClosedTab = input.required<boolean>();
  isAllTab = input.required<boolean>();

  searchInput = output<string>();
  searchFocus = output<void>();
  searchKeydown = output<KeyboardEvent>();
  clearSearch = output<HTMLInputElement>();
  selectItem = output<SymbolAutocompleteItem>();
  closeDropdown = output<void>();
  refresh = output<void>();
  expandAll = output<void>();
  collapseAll = output<void>();
  setSearchActiveIndex = output<number>();
  
  getAssetTypeClass = input.required<(assetType: string | undefined, symbol: string | undefined) => string>();
}
