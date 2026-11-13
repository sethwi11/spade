import { describe, expect, it } from 'vitest';
import { cardWhen } from './taskCard';

const today = '2026-11-12'; // a Thursday
type Fields = Parameters<typeof cardWhen>[0];
const base: Fields = { dueDate: null, dueTime: null, recurrence: 'none', rollsOver: true, repeatDays: [], status: 'todo', missedAt: null };

describe('the day and time on a to-do card', () => {
  it('says the date, and the time, for something overdue', () => {
    expect(cardWhen({ ...base, dueDate: '2026-11-09', dueTime: '23:59' }, 'overdue', today)).toEqual({ text: 'Nov 9 · 11:59 PM', kind: 'overdue' });
    expect(cardWhen({ ...base, dueDate: '2026-11-10' }, 'overdue', today)).toEqual({ text: 'Nov 10', kind: 'overdue' });
  });

  it('shows only the time for something due today, in 12-hour form, and nothing without one', () => {
    expect(cardWhen({ ...base, dueDate: today, dueTime: '17:00' }, 'today', today)).toEqual({ text: '5:00 PM', kind: 'time' });
    expect(cardWhen({ ...base, dueDate: today }, 'today', today)).toBeNull();
  });

  it('says "Until" and the last day for a rolling task that began earlier, never overdue', () => {
    const weekly: Fields = { ...base, recurrence: 'weekly', dueDate: '2026-11-09' }; // began Monday, next one is Monday the 16th
    expect(cardWhen(weekly, 'today', today)).toEqual({ text: 'Until Sun', kind: 'until' });
  });

  it('names the weekday in Coming up, with the time when there is one', () => {
    expect(cardWhen({ ...base, dueDate: '2026-11-13' }, 'soon', today)).toEqual({ text: 'Fri', kind: 'day' });
    expect(cardWhen({ ...base, dueDate: '2026-11-16', dueTime: '16:30' }, 'soon', today)).toEqual({ text: 'Mon 4:30 PM', kind: 'time' });
    expect(cardWhen({ ...base, dueDate: '2026-11-19' }, 'soon', today)).toEqual({ text: 'Nov 19', kind: 'day' }); // a week out is the same weekday as today
  });

  it('gives the date for Later, and nothing when there is no date', () => {
    expect(cardWhen({ ...base, dueDate: '2026-11-24' }, 'later', today)).toEqual({ text: 'Nov 24', kind: 'day' });
    expect(cardWhen({ ...base, dueDate: '2026-11-21', dueTime: '13:00' }, 'later', today)).toEqual({ text: 'Nov 21 · 1:00 PM', kind: 'time' });
    expect(cardWhen({ ...base }, 'later', today)).toBeNull();
  });
});
