import { classTitle, type Course, type Semester, type WeekTemplate } from '@todo/shared';
import type { ClassSlot } from './WeekGrid';

/** Classes from Courses whose semester overlaps the template's dates, one per meeting day: for the Week grid, and for noticing a class that overlaps a block every week. */
export function classSlots(template: Pick<WeekTemplate, 'effectiveFrom' | 'effectiveTo'> | undefined, semesters: readonly Semester[], courses: readonly Course[]): ClassSlot[] {
  if (!template) return [];
  const inRange = new Set(semesters.filter((s) => !s.archived && s.endDate >= template.effectiveFrom && (template.effectiveTo === null || s.startDate <= template.effectiveTo)).map((s) => s.id));
  return courses.filter((c) => inRange.has(c.semesterId)).flatMap((c) => c.meetingDays.map((weekday) => ({ key: `class:${c.id}:${weekday}`, title: classTitle(c), weekday, start: c.startTime, end: c.endTime, color: c.color })));
}
