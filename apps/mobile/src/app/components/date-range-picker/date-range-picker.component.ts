import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DatePreset {
  id: string;
  label: string;
  getRange: (now?: Date) => DateRange;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelectedStart: boolean;
  isSelectedEnd: boolean;
  isInRange: boolean;
  isInHoverRange: boolean;
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DATE_PRESETS: DatePreset[] = [
  {
    id: 'all',
    label: 'All Time',
    getRange: () => ({ startDate: '', endDate: '' }),
  },
  {
    id: 'last-7-days',
    label: 'Last 7 Days',
    getRange: (now = new Date()) => {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { startDate: formatDateISO(start), endDate: formatDateISO(now) };
    },
  },
  {
    id: 'last-30-days',
    label: 'Last 30 Days',
    getRange: (now = new Date()) => {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { startDate: formatDateISO(start), endDate: formatDateISO(now) };
    },
  },
  {
    id: 'last-90-days',
    label: 'Last 90 Days',
    getRange: (now = new Date()) => {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      return { startDate: formatDateISO(start), endDate: formatDateISO(now) };
    },
  },
  {
    id: 'this-month',
    label: 'This Month',
    getRange: (now = new Date()) => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDateISO(start), endDate: formatDateISO(now) };
    },
  },
  {
    id: 'last-month',
    label: 'Last Month',
    getRange: (now = new Date()) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    },
  },
  {
    id: 'ytd',
    label: 'Year to Date (YTD)',
    getRange: (now = new Date()) => {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: formatDateISO(start), endDate: formatDateISO(now) };
    },
  },
  {
    id: 'last-year',
    label: 'Last Year',
    getRange: (now = new Date()) => {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    },
  },
];

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './date-range-picker.component.html',
  styleUrl: './date-range-picker.component.css',
})
export class DateRangePickerComponent {
  /** Inputs */
  readonly startDate = input<string>('');
  readonly endDate = input<string>('');
  readonly placeholder = input<string>('All Dates');

  /** Output */
  readonly rangeChange = output<DateRange>();

  /** Internal State */
  readonly isOpen = signal<boolean>(false);
  readonly selectedPreset = signal<string>('all');
  readonly tempStartDate = signal<string>('');
  readonly tempEndDate = signal<string>('');
  readonly hoverDate = signal<string>('');

  // Calendar View Month & Year (0-indexed month)
  readonly viewYear = signal<number>(new Date().getFullYear());
  readonly viewMonth = signal<number>(new Date().getMonth());

  readonly presets = DATE_PRESETS;
  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  constructor(public readonly elementRef: ElementRef) {
    effect(() => {
      const start = this.startDate();
      const end = this.endDate();
      this.tempStartDate.set(start);
      this.tempEndDate.set(end);

      // Initialize calendar view to start date if available
      if (start) {
        const parts = start.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y) && !isNaN(m)) {
            this.viewYear.set(y);
            this.viewMonth.set(m);
          }
        }
      }

      this.updateActivePresetId(start, end);
    });
  }

  readonly currentMonthLabel = computed<string>(() => {
    const month = this.monthNames[this.viewMonth()];
    const year = this.viewYear();
    return `${month} ${year}`;
  });

  readonly hasActiveFilter = computed<boolean>(() => {
    return !!this.startDate() || !!this.endDate();
  });

  readonly displayText = computed<string>(() => {
    const start = this.startDate();
    const end = this.endDate();

    if (!start && !end) {
      return this.placeholder();
    }

    // Check if matches preset label
    const preset = this.presets.find((p) => p.id === this.selectedPreset() && p.id !== 'all');
    if (preset) {
      return preset.label;
    }

    if (start && end) {
      if (start === end) {
        return this.formatReadableDate(start);
      }
      return `${this.formatReadableDate(start)} – ${this.formatReadableDate(end)}`;
    }

    if (start) {
      return `From ${this.formatReadableDate(start)}`;
    }

    return `Until ${this.formatReadableDate(end)}`;
  });

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const start = this.tempStartDate();
    const end = this.tempEndDate();
    const hover = this.hoverDate();

    const todayStr = formatDateISO(new Date());

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(this.createCalendarDay(dateStr, d, false, todayStr, start, end, hover));
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(this.createCalendarDay(dateStr, d, true, todayStr, start, end, hover));
    }

    // Next month padding to reach 35 or 42 grid
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(this.createCalendarDay(dateStr, d, false, todayStr, start, end, hover));
    }

    return days;
  });

  private createCalendarDay(
    dateStr: string,
    dayNumber: number,
    isCurrentMonth: boolean,
    todayStr: string,
    start: string,
    end: string,
    hover: string
  ): CalendarDay {
    const isSelectedStart = !!start && dateStr === start;
    const isSelectedEnd = !!end && dateStr === end;

    let isInRange = false;
    if (start && end) {
      isInRange = dateStr >= start && dateStr <= end;
    }

    let isInHoverRange = false;
    if (start && !end && hover) {
      const rangeStart = start <= hover ? start : hover;
      const rangeEnd = start <= hover ? hover : start;
      isInHoverRange = dateStr >= rangeStart && dateStr <= rangeEnd;
    }

    return {
      date: dateStr,
      dayNumber,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isSelectedStart,
      isSelectedEnd,
      isInRange,
      isInHoverRange,
    };
  }

  toggleOpen(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.tempStartDate.set(this.startDate());
      this.tempEndDate.set(this.endDate());
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.hoverDate.set('');
  }

  prevMonth(): void {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
  }

  selectDay(day: CalendarDay): void {
    const selected = day.date;
    const start = this.tempStartDate();
    const end = this.tempEndDate();

    if (!start || (start && end)) {
      // First click: set start date
      this.tempStartDate.set(selected);
      this.tempEndDate.set('');
      this.selectedPreset.set('');
    } else if (start && !end) {
      // Second click: set end date
      if (selected < start) {
        this.tempStartDate.set(selected);
        this.tempEndDate.set(start);
      } else {
        this.tempEndDate.set(selected);
      }
      this.applySelection();
    }
  }

  onDayHover(day: CalendarDay): void {
    if (this.tempStartDate() && !this.tempEndDate()) {
      this.hoverDate.set(day.date);
    }
  }

  onDayLeave(): void {
    this.hoverDate.set('');
  }

  selectPreset(preset: DatePreset): void {
    this.selectedPreset.set(preset.id);
    const range = preset.getRange();
    this.tempStartDate.set(range.startDate);
    this.tempEndDate.set(range.endDate);

    if (range.startDate) {
      const parts = range.startDate.split('-');
      if (parts.length === 3) {
        this.viewYear.set(parseInt(parts[0], 10));
        this.viewMonth.set(parseInt(parts[1], 10) - 1);
      }
    }

    this.applySelection();
  }

  onManualStartChange(val: string): void {
    this.tempStartDate.set(val);
    this.selectedPreset.set('');
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          this.viewYear.set(y);
          this.viewMonth.set(m);
        }
      }
    }
  }

  onManualEndChange(val: string): void {
    this.tempEndDate.set(val);
    this.selectedPreset.set('');
  }

  applySelection(): void {
    let start = this.tempStartDate();
    let end = this.tempEndDate();

    if (start && end && start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    this.rangeChange.emit({ startDate: start, endDate: end });
    this.close();
  }

  clearRange(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.tempStartDate.set('');
    this.tempEndDate.set('');
    this.selectedPreset.set('all');
    this.rangeChange.emit({ startDate: '', endDate: '' });
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  private updateActivePresetId(start: string, end: string): void {
    if (!start && !end) {
      this.selectedPreset.set('all');
      return;
    }

    for (const preset of this.presets) {
      if (preset.id === 'all') continue;
      const r = preset.getRange();
      if (r.startDate === start && r.endDate === end) {
        this.selectedPreset.set(preset.id);
        return;
      }
    }

    this.selectedPreset.set('');
  }

  private formatReadableDate(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
