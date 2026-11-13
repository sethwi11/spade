import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowUpDown, ChevronDown, Columns3, Plus, Search, Table2 } from 'lucide-react';
import { APPLICATION_COLUMNS, APPLICATION_STATUSES, applicationCounts, COLUMN_SORTS, filterApplications, followUpSuggestions, sortApplications, type ApplicationSortKey, type ApplicationStatus, type ColumnSort, type SortDirection } from '@todo/shared';
import { useApp } from '../app/AppContext';
import { PageHeader } from '../app/PageHeader';
import { useAttachmentCounts } from '../features/attachments/useAttachments';
import { ApplicationTable } from '../features/applications/ApplicationTable';
import { ApplicationsBoard } from '../features/applications/Board';
import { FollowUps } from '../features/applications/FollowUps';
import { GoalStrip } from '../features/applications/GoalStrip';
import { useAppSettings } from '../data/useApplications';
import { usePersistedState } from '../hooks/usePersistedState';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/fields';
import { Menu } from '../ui/Menu';
import { EmptyState, SkeletonRows } from '../ui/states';

type View = 'board' | 'table';
const SORT_KEYS: readonly ApplicationSortKey[] = ['company', 'role', 'status', 'dateApplied', 'deadline', 'updated'];
/** The first click on a heading: names A to Z, but the newest and the soonest first for dates. */
const FIRST_DIRECTION: Record<ApplicationSortKey, SortDirection> = { company: 'asc', role: 'asc', status: 'asc', dateApplied: 'desc', deadline: 'asc', updated: 'desc' };
const isSorts = (v: unknown): v is Record<string, ColumnSort> => typeof v === 'object' && v !== null && Object.values(v).every((s) => COLUMN_SORTS.some((c) => c.id === s));

/** The internship tracker: your goal and numbers on top, then every application as a pipeline board (drag between stages) or a table (sort and filter). */
export default function ApplicationsPage() {
  const app = useApp();
  const { applications, applicationsLoading, today, openDialog } = app;
  const { settings } = useAppSettings();
  const [params, setParams] = useSearchParams();
  const [sorts, setSorts] = usePersistedState<Record<string, ColumnSort>>('voice-todo.applicationSorts', {}, isSorts);
  const files = useAttachmentCounts('application');

  const view: View = params.get('view') === 'table' ? 'table' : 'board';
  const status = APPLICATION_STATUSES.find((s) => s === params.get('status')) ?? null;
  const query = params.get('q') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const onlyFollowUps = params.get('followUp') === '1';
  const sortParam = params.get('sort');
  const sort: ApplicationSortKey = SORT_KEYS.find((k) => k === sortParam) ?? 'updated';
  const direction: SortDirection = params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : FIRST_DIRECTION[sort];
  const filtering = status !== null || query !== '' || from !== '' || to !== '';

  /** Change some of what's in the address (null removes it). Typing in a filter replaces the entry instead of piling up history. */
  const setView = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  const suggestions = useMemo(() => followUpSuggestions(applications, today), [applications, today]);
  const followUpIds = useMemo(() => new Set(suggestions.map((s) => s.application.id)), [suggestions]);
  const counts = useMemo(() => applicationCounts(app.tasks, app.events), [app.tasks, app.events]);
  const rows = useMemo(
    () => sortApplications(filterApplications(applications, { status, query, appliedFrom: from || undefined, appliedTo: to || undefined }), sort, direction),
    [applications, status, query, from, to, sort, direction],
  );
  const boardCards = useMemo(() => filterApplications(applications, { query }).filter((a) => !onlyFollowUps || followUpIds.has(a.id)), [applications, query, onlyFollowUps, followUpIds]);

  const clickHeading = (key: ApplicationSortKey) => setView(key === sort ? { dir: direction === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: FIRST_DIRECTION[key] });
  const newApplication = () => openDialog({ kind: 'application', id: 'new' });
  const board = view === 'board';

  return (
    <div className={cx('flex min-h-0 flex-1 flex-col', !board && 'max-w-[1200px]')}>
      <PageHeader title="Applications" />

      {applicationsLoading ? (
        <SkeletonRows count={5} />
      ) : (
        <>
          <GoalStrip applications={applications} goal={settings.offerGoal} targetDate={settings.offerTargetDate} today={today} followUps={suggestions.length} onlyFollowUps={onlyFollowUps} onToggleFollowUps={() => setView({ followUp: onlyFollowUps ? null : '1' })} onEditGoal={() => openDialog({ kind: 'settings' })} />

          <div className="mb-5 flex shrink-0 flex-wrap items-center gap-2">
            <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-control border border-rule">
              {(
                [
                  ['board', 'Board', Columns3],
                  ['table', 'Table', Table2],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView({ view: id })}
                  className={cx('inline-flex h-8 items-center gap-2 px-3 text-body transition-colors duration-150 ease-out', view === id ? 'bg-ink text-paper' : 'text-ink hover:bg-accent-soft')}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            {board && (
              <>
                <div role="search" className="relative w-48 max-sm:order-last max-sm:w-full">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                  <Input type="search" aria-label="Search company or role" placeholder="Search" value={query} onChange={(e) => setView({ q: e.target.value })} className="pl-9" />
                </div>
                <Menu
                  items={COLUMN_SORTS.map((s) => ({ label: s.label, onSelect: () => setSorts(Object.fromEntries(APPLICATION_COLUMNS.map((c) => [c.id, s.id]))) }))}
                  trigger={(props) => (
                    <Button variant="secondary" icon={ArrowUpDown} aria-label="Sort" {...props}>
                      <span className="max-sm:hidden">Sort</span>
                      <ChevronDown className="size-4" aria-hidden />
                    </Button>
                  )}
                />
              </>
            )}
            <Button variant="primary" icon={Plus} aria-label="New application" className="ml-auto" onClick={newApplication}>
              New<span className="max-sm:hidden"> application</span>
            </Button>
          </div>

          {applications.length === 0 ? (
            <EmptyState message="No applications yet. Add the first one you’re thinking about.">
              <Button variant="primary" icon={Plus} onClick={newApplication}>
                New application
              </Button>
            </EmptyState>
          ) : board ? (
            boardCards.length === 0 ? (
              <EmptyState message={onlyFollowUps ? 'Nothing to follow up on right now.' : 'Nothing matches that search.'}>
                <Button variant="ghost" onClick={() => setView({ q: null, followUp: null })}>
                  Show everything
                </Button>
              </EmptyState>
            ) : (
              <ApplicationsBoard
                applications={boardCards}
                today={today}
                followUpIds={followUpIds}
                counts={counts}
                files={files}
                sorts={sorts}
                onSort={(columnId, columnSort) => setSorts({ ...sorts, [columnId]: columnSort })}
                onMove={(a, s, before) => void app.moveApplication(a, s, before)}
                onFollowUp={(a, answer) => void app.answerFollowUp(a, answer)}
              />
            )
          ) : (
            <div className="min-h-0 flex-1 md:overflow-y-auto">
              <FollowUps suggestions={suggestions} onAnswer={(a, answer) => void app.answerFollowUp(a, answer)} />
              <div role="search" aria-label="Filter applications" className="mb-4 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-label text-ink-muted uppercase">Status</span>
                  <Select aria-label="Status" value={status ?? ''} onChange={(e) => setView({ status: e.target.value })} wrapperClassName="w-48">
                    <option value="">All statuses</option>
                    {APPLICATION_STATUSES.map((s: ApplicationStatus) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block min-w-48 flex-1 sm:max-w-72">
                  <span className="mb-1 block text-label text-ink-muted uppercase">Company or role</span>
                  <Input type="search" value={query} placeholder="Search" onChange={(e) => setView({ q: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-label text-ink-muted uppercase">Applied from</span>
                  <Input type="date" value={from} max={to || undefined} onChange={(e) => setView({ from: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-label text-ink-muted uppercase">to</span>
                  <Input type="date" value={to} min={from || undefined} onChange={(e) => setView({ to: e.target.value })} />
                </label>
                {filtering && (
                  <Button variant="ghost" onClick={() => setView({ status: null, q: null, from: null, to: null })}>
                    Clear filters
                  </Button>
                )}
              </div>
              {filtering && (
                <p className="mb-2 text-meta text-ink-muted" aria-live="polite">
                  Showing {rows.length} of {applications.length}
                </p>
              )}
              <ApplicationTable applications={rows} today={today} sort={sort} direction={direction} onSort={clickHeading} onStatus={(a, s) => void app.moveApplication(a, s, null)} empty="Nothing matches those filters." />
            </div>
          )}
        </>
      )}
    </div>
  );
}
