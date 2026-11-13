import { describe, expect, it } from 'vitest';
import { APPLICATION_COLUMNS, APPLICATION_STATUSES, CALENDAR_COLORS, applicationColumnOf, applicationCounts, monogramColor, sortColumn, type Application } from '../src';

const at = (date: string) => `${date}T12:00:00.000Z`;
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const app = (over: Partial<Application> = {}): Application => ({
  id: id(),
  company: 'Acme',
  role: 'SWE Intern',
  location: null,
  jobLink: null,
  status: 'Wishlist',
  dateApplied: null,
  deadline: null,
  contactName: null,
  contactEmail: null,
  notes: null,
  sortOrder: 1024,
  followUpHandledAt: null,
  statusHistory: [],
  createdAt: at('2026-10-01'),
  updatedAt: at('2026-10-01'),
  ...over,
});

describe('application columns', () => {
  it('shows every status in exactly one column', () => {
    const shown = APPLICATION_COLUMNS.flatMap((c) => c.statuses);
    expect([...shown].sort()).toEqual([...APPLICATION_STATUSES].sort());
  });

  it('calls Online Assessment "Assessment" and puts Rejected and Withdrawn together in Closed', () => {
    expect(applicationColumnOf('Online Assessment')).toBe('assessment');
    expect(applicationColumnOf('Rejected')).toBe('closed');
    expect(applicationColumnOf('Withdrawn')).toBe('closed');
    expect(applicationColumnOf('Offer')).toBe('offer');
  });
});

describe('monogramColor', () => {
  it('gives the same company the same palette color every time, whatever the case or spacing', () => {
    expect(monogramColor('Northwind Labs')).toBe(monogramColor('  northwind labs '));
    expect(CALENDAR_COLORS).toContain(monogramColor('Northwind Labs'));
  });

  it('spreads different companies over several colors', () => {
    const names = ['Northwind Labs', 'Bluefin Software', 'Cobalt Health', 'Lumen Cloud', 'Harbor Analytics', 'Ember Robotics', 'Marlin Systems', 'Juniper Systems'];
    expect(new Set(names.map(monogramColor)).size).toBeGreaterThanOrEqual(4);
  });
});

describe('sortColumn', () => {
  const a = app({ company: 'Bluefin', sortOrder: 3000, dateApplied: '2026-11-01', deadline: '2026-12-01' });
  const b = app({ company: 'cobalt', sortOrder: 1000, dateApplied: '2026-11-05' });
  const c = app({ company: 'Acme', sortOrder: 2000, createdAt: at('2026-10-20'), deadline: '2026-11-20' }); // never applied: counts from when it was added
  const names = (list: Application[]) => list.map((x) => x.company);

  it('keeps your own order when asked for it', () => expect(names(sortColumn([a, b, c], 'manual'))).toEqual(['cobalt', 'Acme', 'Bluefin']));
  it('puts the most recently applied first for newest, and the reverse for oldest', () => {
    expect(names(sortColumn([a, b, c], 'newest'))).toEqual(['cobalt', 'Bluefin', 'Acme']);
    expect(names(sortColumn([a, b, c], 'oldest'))).toEqual(['Acme', 'Bluefin', 'cobalt']);
  });
  it('puts the soonest deadline first and those without one last', () => expect(names(sortColumn([a, b, c], 'deadline'))).toEqual(['Acme', 'Bluefin', 'cobalt']));
  it('sorts company names A to Z without regard to case', () => expect(names(sortColumn([a, b, c], 'company'))).toEqual(['Acme', 'Bluefin', 'cobalt']));
  it('leaves the list it was given alone', () => {
    const list = [a, b, c];
    sortColumn(list, 'company');
    expect(names(list)).toEqual(['Bluefin', 'cobalt', 'Acme']);
  });
});

describe('applicationCounts', () => {
  it('counts open to-dos and events per application, leaving out finished to-dos and unlinked items', () => {
    const x = id();
    const y = id();
    const counts = applicationCounts(
      [
        { applicationId: x, status: 'todo' },
        { applicationId: x, status: 'todo' },
        { applicationId: x, status: 'done' },
        { applicationId: null, status: 'todo' },
      ],
      [{ applicationId: x }, { applicationId: y }, { applicationId: y }, { applicationId: null }],
    );
    expect(counts.get(x)).toEqual({ todos: 2, interviews: 1 });
    expect(counts.get(y)).toEqual({ todos: 0, interviews: 2 });
    expect(counts.size).toBe(2);
  });
});
