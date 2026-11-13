import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayLocalISO } from '../lib/dates';
import { createClock, msUntilNextMinute } from './clock';

describe('msUntilNextMinute', () => {
  it('counts to the top of the next minute', () => {
    expect(msUntilNextMinute(new Date(2026, 10, 4, 10, 30, 0, 0))).toBe(60_000);
    expect(msUntilNextMinute(new Date(2026, 10, 4, 10, 30, 45, 500))).toBe(14_500);
    expect(msUntilNextMinute(new Date(2026, 10, 4, 10, 30, 59, 999))).toBe(1);
  });
});

describe('the shared clock', () => {
  const wake = new EventTarget();
  const make = () => createClock(() => new Date(), [[wake, 'focus']]);
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks when the minute turns, for everyone listening', () => {
    vi.setSystemTime(new Date(2026, 10, 4, 10, 30, 45, 500));
    const clock = make();
    const seen = vi.fn();
    clock.subscribe(seen);
    vi.advanceTimersByTime(14_000);
    expect(seen).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(clock.get().getMinutes()).toBe(31);
  });

  it('follows the date past midnight', () => {
    vi.setSystemTime(new Date(2026, 10, 11, 23, 59, 30));
    const clock = make();
    clock.subscribe(() => {});
    expect(todayLocalISO(clock.get())).toBe('2026-11-11');
    vi.advanceTimersByTime(31_000);
    expect(todayLocalISO(clock.get())).toBe('2026-11-12');
  });

  it('catches up the moment the window wakes after a Mac slept through midnight', () => {
    vi.setSystemTime(new Date(2026, 10, 11, 23, 30));
    const clock = make();
    const seen = vi.fn();
    clock.subscribe(seen);
    // The Mac sleeps: the date moves on but the paused timer does not fire.
    vi.setSystemTime(new Date(2026, 10, 12, 7, 30));
    expect(todayLocalISO(clock.get())).toBe('2026-11-11'); // still "yesterday" until something wakes it
    wake.dispatchEvent(new Event('focus'));
    expect(todayLocalISO(clock.get())).toBe('2026-11-12');
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('stops its timer and its listeners when nobody is listening', () => {
    const clock = make();
    const seen = vi.fn();
    const stop = clock.subscribe(seen);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    wake.dispatchEvent(new Event('focus'));
    expect(seen).not.toHaveBeenCalled();
  });
});
