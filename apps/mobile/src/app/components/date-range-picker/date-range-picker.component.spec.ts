import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateRangePickerComponent, DATE_PRESETS } from './date-range-picker.component';

describe('DateRangePickerComponent', () => {
  let component: DateRangePickerComponent;
  let fixture: ComponentFixture<DateRangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateRangePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DateRangePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and default to all dates', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen()).toBe(false);
    expect(component.displayText()).toBe('All Dates');
    expect(component.hasActiveFilter()).toBe(false);
  });

  it('should toggle dropdown open and close', () => {
    component.toggleOpen();
    expect(component.isOpen()).toBe(true);

    component.close();
    expect(component.isOpen()).toBe(false);
  });

  it('should format date range display text correctly', () => {
    fixture.componentRef.setInput('startDate', '2024-01-10');
    fixture.componentRef.setInput('endDate', '2024-02-10');
    fixture.detectChanges();

    expect(component.hasActiveFilter()).toBe(true);
    expect(component.displayText()).toContain('Jan 10, 2024');
    expect(component.displayText()).toContain('Feb 10, 2024');
  });

  it('should emit rangeChange when selecting preset', () => {
    let emittedRange: { startDate: string; endDate: string } | null = null;
    component.rangeChange.subscribe((range) => {
      emittedRange = range;
    });

    const ytdPreset = DATE_PRESETS.find((p) => p.id === 'ytd')!;
    component.selectPreset(ytdPreset);

    expect(emittedRange).not.toBeNull();
    expect(emittedRange!.startDate).toContain('-01-01');
    expect(component.isOpen()).toBe(false);
  });

  it('should clear date range on reset / clear', () => {
    let emittedRange: { startDate: string; endDate: string } | null = null;
    component.rangeChange.subscribe((range) => {
      emittedRange = range;
    });

    fixture.componentRef.setInput('startDate', '2024-01-10');
    fixture.componentRef.setInput('endDate', '2024-02-10');
    fixture.detectChanges();

    component.clearRange();

    expect(emittedRange).toEqual({ startDate: '', endDate: '' });
    expect(component.selectedPreset()).toBe('all');
  });

  it('should navigate months in calendar', () => {
    component.viewYear.set(2024);
    component.viewMonth.set(0); // Jan 2024
    expect(component.currentMonthLabel()).toBe('January 2024');

    component.nextMonth();
    expect(component.currentMonthLabel()).toBe('February 2024');

    component.prevMonth();
    expect(component.currentMonthLabel()).toBe('January 2024');

    component.prevMonth();
    expect(component.currentMonthLabel()).toBe('December 2023');
  });

  it('should handle calendar day selection for start and end date', () => {
    let emittedRange: { startDate: string; endDate: string } | null = null;
    component.rangeChange.subscribe((range) => {
      emittedRange = range;
    });

    const day1 = {
      date: '2024-01-10',
      dayNumber: 10,
      isCurrentMonth: true,
      isToday: false,
      isSelectedStart: false,
      isSelectedEnd: false,
      isInRange: false,
      isInHoverRange: false,
    };

    const day2 = {
      date: '2024-01-20',
      dayNumber: 20,
      isCurrentMonth: true,
      isToday: false,
      isSelectedStart: false,
      isSelectedEnd: false,
      isInRange: false,
      isInHoverRange: false,
    };

    // First click: sets start date
    component.selectDay(day1);
    expect(component.tempStartDate()).toBe('2024-01-10');
    expect(component.tempEndDate()).toBe('');

    // Second click: sets end date and applies
    component.selectDay(day2);
    expect(emittedRange).toEqual({ startDate: '2024-01-10', endDate: '2024-01-20' });
    expect(component.isOpen()).toBe(false);
  });
});
