import { CALENDAR_COLORS, type CalendarColor } from './palette';
import { appliedDate, localDateOf } from './applications';
import type { Event } from './models/events';
import { type Application, type ApplicationStatus } from './models/applications';
import type { Task } from './models/tasks';

// The Applications board: which column a status shows in, how a column is ordered, and the small numbers on a card.

/** Six columns for seven statuses: Online Assessment reads "Assessment", and Rejected and Withdrawn share Closed. */
export const APPLICATION_COLUMNS = [
  { id: 'wishlist', title: 'Wishlist', statuses: ['Wishlist'] },
  { id: 'applied', title: 'Applied', statuses: ['Applied'] },
  { id: 'assessment', title: 'Assessment', statuses: ['Online Assessment'] },
  { id: 'interviewing', title: 'Interviewing', statuses: ['Interviewing'] },
  { id: 'offer', title: 'Offer', statuses: ['Offer'] },
  { id: 'closed', title: 'Closed', statuses: ['Rejected', 'Withdrawn'] },
] as const satisfies readonly { id: string; title: string; statuses: readonly ApplicationStatus[] }[];

export type ApplicationColumnId = (typeof APPLICATION_COLUMNS)[number]['id'];

export const applicationColumnOf = (status: ApplicationStatus): ApplicationColumnId =>
  APPLICATION_COLUMNS.find((c) => (c.statuses as readonly ApplicationStatus[]).includes(status))!.id;

/** A color for a company's letter badge, picked from its name so the same company always looks the same (no logos, nothing fetched). */
export function monogramColor(company: string): CalendarColor {
  let h = 0;
  for (const ch of company.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return CALENDAR_COLORS[h % CALENDAR_COLORS.length]!;
}

export const COLUMN_SORTS = [
  { id: 'manual', label: 'Your order' },
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'company', label: 'Company A to Z' },
] as const;
export type ColumnSort = (typeof COLUMN_SORTS)[number]['id'];

/** The day a card counts from for newest and oldest: when it was applied, or else when it was added. */
const sinceDay = (a: Application) => appliedDate(a) ?? localDateOf(a.createdAt);

/** A column's cards in order. "Your order" is the dragged position; the rest are derived, so a dropped card lands where the sort puts it. */
export function sortColumn(apps: readonly Application[], sort: ColumnSort): Application[] {
  const byCompany = (a: Application, b: Application) => a.company.localeCompare(b.company, undefined, { sensitivity: 'base' });
  const compare: Record<ColumnSort, (a: Application, b: Application) => number> = {
    manual: (a, b) => a.sortOrder - b.sortOrder || byCompany(a, b),
    newest: (a, b) => sinceDay(b).localeCompare(sinceDay(a)) || byCompany(a, b),
    oldest: (a, b) => sinceDay(a).localeCompare(sinceDay(b)) || byCompany(a, b),
    deadline: (a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') || byCompany(a, b),
    company: byCompany,
  };
  return [...apps].sort(compare[sort]);
}

export interface CardCounts {
  todos: number;
  /** Events tied to the application (its interviews and other dates). */
  interviews: number;
}

/** What each card's footer counts: its open to-dos and its events. Applications with neither aren't in the map. */
export function applicationCounts(tasks: readonly Pick<Task, 'applicationId' | 'status'>[], events: readonly Pick<Event, 'applicationId'>[]): Map<string, CardCounts> {
  const out = new Map<string, CardCounts>();
  const of = (id: string) => out.get(id) ?? out.set(id, { todos: 0, interviews: 0 }).get(id)!;
  for (const t of tasks) if (t.applicationId && t.status === 'todo') of(t.applicationId).todos++;
  for (const e of events) if (e.applicationId) of(e.applicationId).interviews++;
  return out;
}
