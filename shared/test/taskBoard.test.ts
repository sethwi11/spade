import { describe, expect, it } from 'vitest';
import { boardColumns, comingUpDays, isDoneToday, taskColumn, type Task } from '../src';

// Written at noon UTC so "the day it was on this computer's clock" is the same date in any timezone.
const at = (date: string) => `${date}T12:00:00.000Z`;
let n = 0;
const task = (over: Partial<Task> = {}): Task => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  title: 'Made-up task',
  notes: null,
  dueDate: null,
  dueTime: null,
  priority: 'low',
  calendarId: null,
  courseId: null,
  applicationId: null,
  reminders: [],
  status: 'todo',
  subtasks: [],
  recurrence: 'none',
  estimatedMinutes: null,
  source: 'manual',
  sourceSnippet: null,
  sortOrder: 0,
  createdAt: at('2026-11-01'),
  updatedAt: at('2026-11-01'),
  completedAt: null,
  nextOccurrenceId: null,
  rollsOver: true,
  repeatDays: [],
  missedAt: null,
  ...over,
});

const today = '2026-11-12'; // a Thursday

describe('taskColumn', () => {
  it('puts a to-do due before today in Overdue', () => {
    expect(taskColumn(task({ dueDate: '2026-11-11' }), today)).toBe('overdue');
    expect(taskColumn(task({ dueDate: '2026-11-11', dueTime: '23:59' }), today)).toBe('overdue');
  });

  it('keeps a to-do due today in Due today whatever the time, so 5:00 PM today is never "tomorrow" or "overdue"', () => {
    expect(taskColumn(task({ dueDate: today, dueTime: '17:00' }), today)).toBe('today');
    expect(taskColumn(task({ dueDate: today, dueTime: '07:30' }), today)).toBe('today'); // already past this afternoon, still today
    expect(taskColumn(task({ dueDate: today }), today)).toBe('today');
  });

  it('puts the next 7 days in Coming up, and everything after (or with no date) in Later', () => {
    expect(taskColumn(task({ dueDate: '2026-11-13' }), today)).toBe('soon');
    expect(taskColumn(task({ dueDate: '2026-11-19' }), today)).toBe('soon'); // today + 7
    expect(taskColumn(task({ dueDate: '2026-11-20' }), today)).toBe('later'); // today + 8
    expect(taskColumn(task({ dueDate: null }), today)).toBe('later');
  });

  it('counts the 7 days across a month and year end', () => {
    expect(taskColumn(task({ dueDate: '2027-01-02' }), '2026-12-26')).toBe('soon');
    expect(taskColumn(task({ dueDate: '2027-01-03' }), '2026-12-26')).toBe('later');
  });

  it('shows a rolling repeating task that began before today in Due today, never Overdue', () => {
    expect(taskColumn(task({ recurrence: 'weekly', dueDate: '2026-11-09' }), today)).toBe('today');
  });

  it('still calls a repeating task that does not roll over Overdue', () => {
    expect(taskColumn(task({ recurrence: 'weekly', rollsOver: false, dueDate: '2026-11-09' }), today)).toBe('overdue');
  });

  it('files a repeating task by the date of its one open occurrence', () => {
    expect(taskColumn(task({ recurrence: 'daily', dueDate: '2026-11-13' }), today)).toBe('soon');
    expect(taskColumn(task({ recurrence: 'monthly', dueDate: '2026-12-12' }), today)).toBe('later');
  });

  it('leaves out finished to-dos and repeating ones already replaced by their next occurrence', () => {
    expect(taskColumn(task({ status: 'done', dueDate: today }), today)).toBeNull();
    expect(taskColumn(task({ recurrence: 'weekly', dueDate: '2026-11-02', missedAt: at('2026-11-09') }), today)).toBeNull();
  });
});

describe('isDoneToday', () => {
  it('is true for something finished today, false for earlier days and for open to-dos', () => {
    expect(isDoneToday(task({ status: 'done', completedAt: at(today) }), today)).toBe(true);
    expect(isDoneToday(task({ status: 'done', completedAt: at('2026-11-10') }), today)).toBe(false);
    expect(isDoneToday(task({ status: 'todo', completedAt: null }), today)).toBe(false);
  });
});

describe('boardColumns', () => {
  it('splits to-dos into the columns, keeping their order, with what was finished today on its own', () => {
    const a = task({ title: 'a', dueDate: '2026-11-10' });
    const b = task({ title: 'b', dueDate: today, dueTime: '17:00' });
    const c = task({ title: 'c', dueDate: today });
    const d = task({ title: 'd', dueDate: '2026-11-15' });
    const e = task({ title: 'e' });
    const f = task({ title: 'f', status: 'done', dueDate: today, completedAt: at(today) });
    const g = task({ title: 'g', status: 'done', dueDate: '2026-11-01', completedAt: at('2026-11-01') });
    const columns = boardColumns([a, b, c, d, e, f, g], today);
    expect(columns.overdue.map((t) => t.title)).toEqual(['a']);
    expect(columns.today.map((t) => t.title)).toEqual(['b', 'c']);
    expect(columns.soon.map((t) => t.title)).toEqual(['d']);
    expect(columns.later.map((t) => t.title)).toEqual(['e']);
    expect(columns.doneToday.map((t) => t.title)).toEqual(['f']);
  });
});

describe('comingUpDays', () => {
  it('lists tomorrow through the seventh day, across a month end', () => {
    expect(comingUpDays('2026-11-27')).toEqual(['2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04']);
  });
});
