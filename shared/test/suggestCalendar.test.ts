import { describe, expect, it } from 'vitest';
import { suggestCalendar } from '../src/suggestCalendar';

const calendars = [
  { id: 'school', name: 'School' },
  { id: 'work', name: 'Work' },
  { id: 'acm', name: 'ACM' },
  { id: 'estate', name: 'Real Estate' },
  { id: 'club', name: 'Fashion Club' },
];
const task = (title: string, calendarId: string | null) => ({ title, calendarId });
const tasks = [
  task('Plan the runway with Marisol', 'club'),
  task('Runway budget', 'club'),
  task('Lease review', 'estate'),
  task('Lease addendum', 'estate'),
  task('Email Dr. Rivera about the meeting', 'work'),
  task('Meeting notes', 'work'),
  task('Meeting with advisor', 'school'),
  task('Project outline', 'school'),
  task('Project demo', 'school'),
  task('Buy groceries', null),
];

describe('suggestCalendar', () => {
  it('suggests the calendar whose name is in the title, in any case', () => {
    expect(suggestCalendar('Text ACM members', calendars, tasks)).toBe('acm');
    expect(suggestCalendar('finish SCHOOL project', calendars, tasks)).toBe('school');
  });

  it('counts a plural or a possessive as the name', () => {
    expect(suggestCalendar('look at the school’s website', calendars, [])).toBe('school');
    expect(suggestCalendar('read ACMs newsletter', calendars, [])).toBe('acm');
  });

  it('needs every word of a longer name', () => {
    expect(suggestCalendar('Real quick errand', calendars, [])).toBeNull();
    expect(suggestCalendar('Read estate real notes', calendars, [])).toBe('estate');
  });

  it('suggests from a word used on at least two to-dos in one calendar', () => {
    expect(suggestCalendar('Runway tickets', calendars, tasks)).toBe('club');
    expect(suggestCalendar('Sign the lease', calendars, tasks)).toBe('estate');
  });

  it('learns nothing from a word seen once, or spread across calendars', () => {
    expect(suggestCalendar('Marisol birthday card', calendars, tasks)).toBeNull(); // once
    expect(suggestCalendar('Meeting at noon', calendars, tasks)).toBeNull(); // work twice, school once: not clear enough
  });

  it('gives no suggestion when two calendars tie, and the better evidence breaks a tie', () => {
    expect(suggestCalendar('Finish work for school', calendars, [])).toBeNull();
    expect(suggestCalendar('Finish work for the project at school', calendars, tasks)).toBe('school'); // School and Work by name, School also by "project"
  });

  it('ignores to-dos with no calendar, filler words, and empty titles', () => {
    expect(suggestCalendar('Buy groceries', calendars, tasks)).toBeNull();
    expect(suggestCalendar('   ', calendars, tasks)).toBeNull();
    expect(suggestCalendar('Anything', [], [])).toBeNull();
  });
});
