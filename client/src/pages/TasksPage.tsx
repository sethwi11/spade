import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronDown, ListChecks, X } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { PageHeader } from '../app/PageHeader';
import { CalendarsMenu } from '../features/calendar/CalendarsMenu';
import { TaskFilters } from '../features/tasks/TaskFilters';
import { CompletedSection, TaskList } from '../features/tasks/TaskList';
import { usePersistedState } from '../hooks/usePersistedState';
import { formatDueDate } from '../lib/dates';
import { applyFilters, DEFAULT_FILTERS, isFiltering, sortByCompletedDesc, sortTasks, SORT_MODES, type Filters, type SortMode } from '../lib/filters';
import { inCalendar, parseTasksQuery, TASK_TABS, tasksUrl, UNCATEGORIZED, type TaskTab } from '../lib/taskParams';
import { inView } from '../lib/views';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { EmptyState, ErrorBanner, SkeletonRows } from '../ui/states';
import { Tabs } from '../ui/Tabs';

const isSortMode = (v: unknown): v is SortMode => SORT_MODES.some((m) => m.id === v);

const EMPTY_MESSAGE: Record<TaskTab, string> = {
  all: 'No tasks yet.',
  upcoming: 'Nothing in the next 7 days.',
  overdue: 'Nothing overdue.',
  completed: 'Nothing completed yet.',
};

/** Every task, with tabs (All, Upcoming, Overdue, Completed), search, filters, and sorting. */
export default function TasksPage() {
  const { tasks, calendars, calendarsById, today, loading, error, dismissError, reload, openDialog, setCalendarFor } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = parseTasksQuery(params);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortMode, setSortMode] = usePersistedState<SortMode>('voice-todo.sortMode', 'due', isSortMode);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  // A link to a calendar that has since been deleted shouldn't hide everything.
  const uncategorized = query.calendarId === UNCATEGORIZED;
  const calendar = query.calendarId && !uncategorized ? calendarsById.get(query.calendarId) : undefined;
  const calendarId = uncategorized ? UNCATEGORIZED : (calendar?.id ?? null);
  const scope = uncategorized ? 'Uncategorized' : calendar?.name;

  const isCompleted = query.tab === 'completed';
  const { openTasks, doneTasks, inScope } = useMemo(() => {
    const base = tasks.filter((t) => inView(t, { type: 'smart', id: query.tab }, today) && (!calendarId || inCalendar(t, calendarId)) && (!query.date || t.dueDate === query.date));
    const filtered = applyFilters(base, filters, today);
    return {
      openTasks: sortTasks(filtered.filter((t) => t.status === 'todo'), sortMode),
      doneTasks: sortByCompletedDesc(filtered.filter((t) => t.status === 'done')),
      inScope: base.length,
    };
  }, [tasks, query.tab, query.date, calendarId, today, filters, sortMode]);

  // Done tasks tuck under a "Completed" toggle, unless you're looking at the Completed tab or filtering to done.
  const doneAsSection = !isCompleted && filters.status === 'any';
  const mainTasks = doneAsSection ? openTasks : [...openTasks, ...doneTasks];
  const draggable = sortMode === 'manual' && doneAsSection && !selecting;
  const filtering = isFiltering(filters);

  const go = (next: Partial<typeof query>) => navigate(tasksUrl({ ...query, calendarId, ...next }));

  // Picking several to-dos to put in one calendar. Only the ones still on screen count.
  const chosen = mainTasks.filter((t) => picked.has(t.id));
  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
  };
  async function setCalendar(id: string | null) {
    await setCalendarFor(chosen, id);
    setPicked(new Set());
  }

  return (
    <div className="max-w-[960px]">
      <PageHeader title={scope ?? 'Tasks'} quickAddDefaults={{ calendarId: calendar?.id ?? null, dueDate: query.date }} actions={<CalendarsMenu />} />

      {error && <ErrorBanner message={error} onRetry={() => void reload()} onDismiss={dismissError} />}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Tabs label="Task lists" tabs={TASK_TABS} value={query.tab} onChange={(tab) => go({ tab })} />
        <Button variant={selecting ? 'secondary' : 'ghost'} icon={ListChecks} aria-pressed={selecting} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
          Select
        </Button>
      </div>

      {selecting && (
        <div role="region" aria-label="Choose a calendar for the selected to-dos" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-rule bg-surface px-4 py-2.5">
          <p className="mr-auto text-body">
            <span className="font-mono tabular-nums">{chosen.length}</span> selected
          </p>
          <Button variant="ghost" disabled={mainTasks.length === 0} onClick={() => setPicked(new Set(mainTasks.map((t) => t.id)))}>
            Select all {mainTasks.length}
          </Button>
          <Menu
            align="end"
            items={[...calendars.map((c) => ({ label: c.name, onSelect: () => void setCalendar(c.id) })), { label: 'No calendar', onSelect: () => void setCalendar(null) }]}
            trigger={(props) => (
              <Button variant="primary" disabled={chosen.length === 0} {...props}>
                Set calendar
                <ChevronDown className="size-4" aria-hidden />
              </Button>
            )}
          />
        </div>
      )}

      {(scope || query.date) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-meta text-ink-muted">
          Showing
          {scope && <Chip onRemove={() => go({ calendarId: null })}>{scope}</Chip>}
          {query.date && <Chip onRemove={() => go({ date: null })}>Due {formatDueDate(query.date, today)}</Chip>}
        </div>
      )}

      <div className="mb-6">
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          sortMode={sortMode}
          onSortChange={setSortMode}
          calendars={calendars}
          hideCalendar={calendarId !== null}
          hideStatus={isCompleted || query.tab === 'overdue'}
        />
      </div>

      {loading ? (
        <SkeletonRows count={6} />
      ) : mainTasks.length === 0 && doneTasks.length === 0 ? (
        filtering && inScope > 0 ? (
          <EmptyState message="No tasks match those filters.">
            <Button variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState message={scope && query.tab === 'all' ? (uncategorized ? 'Every to-do has a calendar.' : 'No tasks in this calendar.') : EMPTY_MESSAGE[query.tab]}>
            {!isCompleted && (
              <Button variant="ghost" onClick={() => openDialog({ kind: 'task', mode: 'new', defaults: { calendarId: calendar?.id ?? null, dueDate: query.date } })}>
                Add a task
              </Button>
            )}
          </EmptyState>
        )
      ) : (
        <>
          {mainTasks.length > 0 && <TaskList tasks={mainTasks} label="Tasks" draggable={draggable} leaveOnComplete={doneAsSection && !selecting} select={selecting ? { picked, onToggle: toggle } : undefined} />}
          {doneAsSection && <CompletedSection tasks={doneTasks} />}
        </>
      )}
    </div>
  );
}

/** A removable label showing one active URL filter. */
function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-control border border-rule bg-surface pr-1 pl-2 text-ink">
      {children}
      <button type="button" onClick={onRemove} aria-label={`Remove filter: ${typeof children === 'string' ? children : 'this filter'}`} className="grid size-5 place-items-center rounded-control text-ink-muted hover:bg-accent-soft hover:text-ink">
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
