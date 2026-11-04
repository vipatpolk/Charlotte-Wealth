import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  getSymbolLogoConfig,
  isLogoUrlFailed,
  markLogoUrlFailed,
  isLogoUrlLoaded,
  markLogoUrlLoaded,
  SymbolLogoConfig,
} from '../../utils/symbol-icon.utils';

export type SymbolIconSize = number | 'xs' | 'sm' | 'md' | 'lg';
export type SymbolIconShape = 'circle' | 'rounded';

@Component({
  selector: 'app-symbol-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './symbol-icon.component.html',
  styleUrls: ['./symbol-icon.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymbolIconComponent {
  readonly symbol = input.required<string>();
  readonly assetType = input<string | undefined>(undefined);
  readonly size = input<SymbolIconSize>('md');
  readonly shape = input<SymbolIconShape>('circle');
  readonly alt = input<string>('');

  readonly currentSrc = signal<string | null>(null);
  readonly hasError = signal<boolean>(false);
  readonly isLoaded = signal<boolean>(false);

  readonly config = computed<SymbolLogoConfig>(() =>
    getSymbolLogoConfig(this.symbol(), this.assetType())
  );

  readonly pixelSize = computed<number>(() => {
    const s = this.size();
    if (typeof s === 'number') return s;
    switch (s) {
      case 'xs':
        return 20;
      case 'sm':
        return 24;
      case 'lg':
        return 40;
      case 'md':
      default:
        return 32;
    }
  });

  readonly fontSize = computed<number>(() => {
    const p = this.pixelSize();
    // For 20px -> 9px, for 24px -> 10px, for 32px -> 12px, for 40px -> 14px
    return Math.max(9, Math.round(p * 0.38));
  });

  constructor() {
    effect(() => {
      const cfg = this.config();
      this.isLoaded.set(false);
      this.hasError.set(false);

      if (cfg.isMutualFund) {
        this.currentSrc.set(null);
        return;
      }

      // Check primary URL
      const primary = cfg.primaryUrl;
      if (primary && !isLogoUrlFailed(primary)) {
        this.currentSrc.set(primary);
        if (isLogoUrlLoaded(primary)) {
          this.isLoaded.set(true);
        }
        return;
      }

      // Check secondary URL
      const secondary = cfg.secondaryUrl;
      if (secondary && !isLogoUrlFailed(secondary)) {
        this.currentSrc.set(secondary);
        if (isLogoUrlLoaded(secondary)) {
          this.isLoaded.set(true);
        }
        return;
      }

      // Both failed or unavailable -> monogram fallback
      this.currentSrc.set(null);
      this.hasError.set(true);
    });
  }

  onImageLoad(): void {
    const src = this.currentSrc();
    if (src) {
      markLogoUrlLoaded(src);
    }
    this.isLoaded.set(true);
  }

  onImageError(): void {
    const failed = this.currentSrc();
    if (failed) {
      markLogoUrlFailed(failed);
    }

    const cfg = this.config();
    // If primary failed, attempt secondary
    if (failed === cfg.primaryUrl && cfg.secondaryUrl && !isLogoUrlFailed(cfg.secondaryUrl)) {
      this.currentSrc.set(cfg.secondaryUrl);
      if (isLogoUrlLoaded(cfg.secondaryUrl)) {
        this.isLoaded.set(true);
      }
    } else {
      // Both failed
      this.currentSrc.set(null);
      this.hasError.set(true);
    }
  }
}
