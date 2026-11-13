import type { Course, Semester } from '@todo/shared';
import { describe, expect, it } from 'vitest';
import { classSlots } from './classSlots';

const semester = (id: string, startDate: string, endDate: string, archived = false) => ({ id, startDate, endDate, archived }) as Semester;
const course = (id: string, semesterId: string, meetingDays: number[]) => ({ id, semesterId, meetingDays, code: 'MATH 101', name: 'Calculus', startTime: '09:00', endTime: '10:15', color: 'teal' }) as unknown as Course;

describe('classSlots', () => {
  const semesters = [semester('fall', '2026-08-12', '2026-12-04'), semester('spring', '2027-01-20', '2027-05-14'), semester('old', '2026-01-12', '2026-05-01', true)];
  const courses = [course('a', 'fall', [2, 4]), course('b', 'spring', [1]), course('c', 'old', [3])];

  it('lists one slot per meeting day for classes in a semester that overlaps the template', () => {
    const slots = classSlots({ effectiveFrom: '2026-08-12', effectiveTo: '2026-12-04' }, semesters, courses);
    expect(slots.map((s) => [s.key, s.weekday, s.start, s.end])).toEqual([
      ['class:a:2', 2, '09:00', '10:15'],
      ['class:a:4', 4, '09:00', '10:15'],
    ]);
  });

  it('follows the template to the next semester, and a template with no end date reaches every later one', () => {
    expect(classSlots({ effectiveFrom: '2027-01-01', effectiveTo: null }, semesters, courses).map((s) => s.key)).toEqual(['class:b:1']);
  });

  it('leaves out archived semesters, and has nothing without a template', () => {
    expect(classSlots({ effectiveFrom: '2026-01-01', effectiveTo: '2026-06-01' }, semesters, courses)).toEqual([]);
    expect(classSlots(undefined, semesters, courses)).toEqual([]);
  });
});
