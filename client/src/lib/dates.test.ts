import { describe, expect, it } from 'vitest';
import { daysBetween, formatCountdown, formatDueDate, formatTime, parseLocalISODate, todayLocalISO } from './dates';

describe('local date helpers', () => {
  it('formats today using local date parts, not UTC', () => {
    // 11:30 PM local time must still be "today", even though UTC may already be tomorrow.
    expect(todayLocalISO(new Date(2026, 9, 21, 23, 30))).toBe('2026-10-21');
  });

  it('parses YYYY-MM-DD as local midnight', () => {
    const d = parseLocalISODate('2026-10-24');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 24, 0]);
  });

  it('counts calendar days across a DST change and month boundaries', () => {
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2); // spans US DST end (Nov 1)
    expect(daysBetween('2026-10-21', '2026-10-20')).toBe(-1);
  });

  it('labels due dates relative to today', () => {
    const today = '2026-10-21'; // a Wednesday
    expect(formatDueDate('2026-10-21', today)).toBe('Today');
    expect(formatDueDate('2026-10-22', today)).toBe('Tomorrow');
    expect(formatDueDate('2026-10-20', today)).toBe('Yesterday');
    expect(formatDueDate('2026-10-23', today)).toMatch(/Friday/);
  });
});

describe('Today, Tomorrow and Yesterday at every time of day', () => {
  // The task is due Thursday Nov 12; the label depends only on the date the clock shows, never the hour.
  const label = (clock: Date, due = '2026-11-12') => formatDueDate(due, todayLocalISO(clock));

  it('says Tomorrow until midnight, Today from midnight to the last minute, then Yesterday', () => {
    expect(label(new Date(2026, 10, 11, 0, 0))).toBe('Tomorrow');
    expect(label(new Date(2026, 10, 11, 23, 59))).toBe('Tomorrow');
    expect(label(new Date(2026, 10, 12, 0, 0))).toBe('Today');
    expect(label(new Date(2026, 10, 12, 12, 0))).toBe('Today');
    expect(label(new Date(2026, 10, 12, 23, 59))).toBe('Today');
    expect(label(new Date(2026, 10, 13, 0, 0))).toBe('Yesterday');
  });

  it('stays right on the days that are 23 or 25 hours long, and across the new year', () => {
    expect(formatDueDate('2026-11-01', '2026-10-31')).toBe('Tomorrow'); // clocks go back on Nov 1
    expect(formatDueDate('2026-11-02', '2026-11-01')).toBe('Tomorrow'); // a 25-hour day
    expect(formatDueDate('2027-03-14', '2027-03-13')).toBe('Tomorrow'); // clocks go forward on Mar 14
    expect(formatDueDate('2027-03-15', '2027-03-14')).toBe('Tomorrow'); // a 23-hour day
    expect(formatDueDate('2027-01-01', '2026-12-31')).toBe('Tomorrow');
    expect(formatDueDate('2026-12-31', '2027-01-01')).toBe('Yesterday');
  });
});

describe('formatCountdown', () => {
  const min = 60_000;
  it('formats minutes, hours, and days', () => {
    expect(formatCountdown(0)).toBe('now');
    expect(formatCountdown(-5 * min)).toBe('now');
    expect(formatCountdown(30_000)).toBe('<1m');
    expect(formatCountdown(45 * min)).toBe('45m');
    expect(formatCountdown(2 * 60 * min + 15 * min)).toBe('2h 15m');
    expect(formatCountdown(3 * 60 * min)).toBe('3h');
    expect(formatCountdown(27 * 60 * min)).toBe('1d 3h');
    expect(formatCountdown(48 * 60 * min)).toBe('2d');
  });
});

describe('formatTime', () => {
  it('always shows 12-hour time with AM/PM', () => {
    expect(formatTime('14:30')).toBe('2:30 PM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('12:05')).toBe('12:05 PM');
  });
});
