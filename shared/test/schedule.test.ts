import { describe, expect, it } from 'vitest';
import { awaySummary, dueNow, type Popup } from '../src';

// A made-up evening.
const DAY = '2026-11-11';
const popup = (time: string, key: string): Popup => ({ at: `${DAY}T${time}`, title: key, body: '', url: '/', keys: [key] });
const list = [popup('18:00', 'start:dinner'), popup('19:00', 'start:study'), popup('19:55', 'warn:study'), popup('20:00', 'stop:study'), popup('21:00', 'due:lab')];
const at = (time: string) => `${DAY}T${time}`;
const keys = (ps: Popup[]) => ps.map((p) => p.keys[0]);

describe('dueNow', () => {
  it('shows what lands on this minute and nothing earlier or later', () => {
    const due = dueNow(list, at('18:59'), at('19:00'), new Set());
    expect(keys(due.show)).toEqual(['start:study']);
    expect(due.missed).toEqual([]);
  });

  it('never shows something already sent', () => {
    expect(dueNow(list, at('18:59'), at('19:00'), new Set(['start:study'])).show).toEqual([]);
  });

  it('after sleep, shows what is at most five minutes late and counts the rest as missed', () => {
    const due = dueNow(list, at('17:30'), at('20:03'), new Set());
    expect(keys(due.show)).toEqual(['stop:study']);
    expect(keys(due.missed)).toEqual(['start:dinner', 'start:study', 'warn:study']);
  });

  it('counts a pop-up listed twice once', () => {
    expect(dueNow([...list, ...list], at('18:59'), at('19:00'), new Set()).show).toHaveLength(1);
  });

  it('fires nothing twice when the clock is set back', () => {
    const sent = new Set(['start:dinner', 'start:study']);
    // The clock went from 7:10 PM back to 5:50 PM, then reached 6:00 PM again.
    expect(dueNow(list, at('17:50'), at('18:00'), sent).show).toEqual([]);
    expect(keys(dueNow(list, at('18:00'), at('19:55'), sent).show)).toEqual(['warn:study']);
  });
});

describe('awaySummary', () => {
  it('says how many blocks passed and what is on now', () => {
    const { missed } = dueNow(list, at('17:30'), at('20:30'), new Set());
    expect(awaySummary(missed, at('20:30'), 'Free until 10:00 PM')).toMatchObject({ title: 'While you were away: 2 blocks passed', body: 'Now: Free until 10:00 PM' });
  });

  it('counts reminders when no block started', () => {
    expect(awaySummary([popup('21:00', 'due:lab')], at('22:00'), null)).toMatchObject({ title: 'While you were away: 1 reminder passed', body: '' });
  });

  it('is nothing when nothing was missed', () => {
    expect(awaySummary([], at('22:00'), null)).toBeNull();
  });
});
