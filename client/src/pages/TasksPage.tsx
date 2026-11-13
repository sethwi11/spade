import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronDown, ChevronRight, Columns3, History, List, ListChecks, X } from 'lucide-react';
import { addDays, boardColumns, taskColumn, type Task } from '@todo/shared';
import { useApp } from '../app/AppContext';
import { PageHeader } from '../app/PageHeader';
import { CalendarsMenu } from '../features/calendar/CalendarsMenu';
import { MoveDialog, type MoveMode } from '../features/tasks/MoveDialog';
import { TaskCard, type MoveHow } from '../features/tasks/TaskCard';
import { TaskFilters } from '../features/tasks/TaskFilters';
import { CompletedSection, TaskList } from '../features/tasks/TaskList';
import { usePersistedState } from '../hooks/usePersistedState';
import { cx } from '../lib/cx';
import { formatDueDate } from '../lib/dates';
import { applyFilters, DEFAULT_FILTERS, isFiltering, sortByCompletedDesc, sortTasks, SORT_MODES, type Filters, type SortMode } from '../lib/filters';
import { inCalendar, parseTasksQuery, TASK_TABS, tasksUrl, UNCATEGORIZED, type TaskTab } from '../lib/taskParams';
import { inView } from '../lib/views';
import { Board, type BoardColumn } from '../ui/Board';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { Segmented } from '../ui/Segmented';
import { EmptyState, ErrorBanner, SkeletonRows } from '../ui/states';
import { Switch } from '../ui/Switch';
import { Tabs } from '../ui/Tabs';

const isSortMode = (v: unknown): v is SortMode => SORT_MODES.some((m) => m.id === v);
type Layout = 'board' | 'list';
const isLayout = (v: unknown): v is Layout => v === 'board' || v === 'list';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

const EMPTY_MESSAGE: Record<TaskTab, string> = {
  all: 'No tasks yet.',
  upcoming: 'Nothing in the next 7 days.',
  overdue: 'Nothing overdue.',
  completed: 'Nothing completed yet.',
};

const Quiet = ({ children }: { children: ReactNode }) => <p className="px-2 py-6 text-center font-display text-title text-ink-muted italic">{children}</p>;

/** Every task: a board by when it is due (the default) or the list, with search, filters, sorting, and the calendar it belongs to. */
export default function TasksPage() {
  const { tasks, calendars, calendarsById, today, loading, error, dismissError, reload, openDialog, setCalendarFor, rescheduleTask, moveTask } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = parseTasksQuery(params);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortMode, setSortMode] = usePersistedState<SortMode>('voice-todo.sortMode', 'due', isSortMode);
  const [layout, setLayout] = usePersistedState<Layout>('voice-todo.tasksLayout', 'board', isLayout);
  const [hideRepeating, setHideRepeating] = usePersistedState<boolean>('voice-todo.hideRepeating', false, isBool);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [moving, setMoving] = useState<{ task: Task; mode: MoveMode } | null>(null);

  // A link to a calendar that has since been deleted shouldn't hide everything.
  const uncategorized = query.calendarId === UNCATEGORIZED;
  const calendar = query.calendarId && !uncategorized ? calendarsById.get(query.calendarId) : undefined;
  const calendarId = uncategorized ? UNCATEGORIZED : (calendar?.id ?? null);
  const scope = uncategorized ? 'Uncategorized' : calendar?.name;

  // The board is the plain "All" tab; Upcoming, Overdue and Completed are lists.
  const board = layout === 'board' && query.tab === 'all';
  const isCompleted = query.tab === 'completed';
  const { openTasks, doneTasks, inScope } = useMemo(() => {
    const base = tasks.filter((t) => inView(t, { type: 'smart', id: query.tab }, today) && (!calendarId || inCalendar(t, calendarId)) && (!query.date || t.dueDate === query.date) && (!hideRepeating || t.recurrence === 'none'));
    // The board's columns already say open or done.
    const filtered = applyFilters(base, board ? { ...filters, status: 'any' } : filters, today);
    return {
      openTasks: sortTasks(filtered.filter((t) => t.status === 'todo'), sortMode),
      doneTasks: sortByCompletedDesc(filtered.filter((t) => t.status === 'done')),
      inScope: base.length,
    };
  }, [tasks, query.tab, query.date, calendarId, today, filters, sortMode, board, hideRepeating]);
  const columns = useMemo(() => boardColumns([...openTasks, ...doneTasks], today), [openTasks, doneTasks, today]);

  // Done tasks tuck under a "Completed" toggle, unless you're looking at the Completed tab or filtering to done.
  const doneAsSection = !isCompleted && filters.status === 'any';
  const mainTasks = doneAsSection ? openTasks : [...openTasks, ...doneTasks];
  const draggable = sortMode === 'manual' && doneAsSection && !selecting;
  const filtering = isFiltering(filters);

  const go = (next: Partial<typeof query>) => navigate(tasksUrl({ ...query, calendarId, ...next }));

  // Picking several to-dos to put in one calendar. Only the ones still on screen count.
  const selectable = board ? [...columns.overdue, ...columns.today, ...columns.soon, ...columns.later] : mainTasks;
  const chosen = selectable.filter((t) => picked.has(t.id));
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

  // Moving a card without a drag, and what a drop does: Due today takes the day (keeping any time), Coming up and Later ask, Overdue takes nothing.
  const reschedule = (task: Task, dueDate: string | null) => void rescheduleTask(task, { dueDate, dueTime: dueDate ? task.dueTime : null });
  const moveCard = (task: Task, how: MoveHow) => (how === 'today' ? reschedule(task, today) : how === 'clear' ? reschedule(task, null) : setMoving({ task, mode: 'any' }));
  function dropCard(task: Task, to: string, beforeId: string | null) {
    if (to === taskColumn(task, today)) {
      // Within its own column only your own order can change.
      if (sortMode !== 'manual') return;
      const others = columns[to as keyof typeof columns].filter((t) => t.id !== task.id);
      const at = beforeId === null ? -1 : others.findIndex((t) => t.id === beforeId);
      const next = at < 0 ? undefined : others[at];
      moveTask(task.id, next ? others[at - 1] : others.at(-1), next);
    } else if (to === 'today') reschedule(task, today);
    else if (to === 'soon' || to === 'later') setMoving({ task, mode: to });
  }

  const add = (dueDate: string | null) => ({ label: 'Add task', onAdd: () => openDialog({ kind: 'task', mode: 'new', defaults: { calendarId: calendar?.id ?? null, dueDate } }) });
  const boardDef: BoardColumn<Task>[] = [
    { id: 'overdue', title: 'Overdue', dot: 'var(--danger)', items: columns.overdue, droppable: false, empty: <Quiet>Nothing overdue. Nice.</Quiet> },
    { id: 'today', title: 'Due today', dot: 'var(--accent)', items: columns.today, add: add(today), empty: <Quiet>Nothing due today.</Quiet>, footer: <DoneToday tasks={columns.doneToday} today={today} onMove={moveCard} /> },
    { id: 'soon', title: 'Coming up', dot: 'var(--cal-dusty-blue)', items: columns.soon, add: add(addDays(today, 1)), empty: <Quiet>Nothing in the next 7 days.</Quiet> },
    { id: 'later', title: 'Later', dot: 'var(--ink-muted)', items: columns.later, add: add(null), empty: <Quiet>Nothing for later.</Quiet> },
  ];
  const nothingShown = boardDef.every((c) => c.items.length === 0) && columns.doneToday.length === 0;

  const clearFilters = (
    <Button variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
      Clear filters
    </Button>
  );

  return (
    <div className={cx('flex min-h-0 flex-1 flex-col', !board && 'max-w-[960px]')}>
      <PageHeader title={scope ?? 'Tasks'} quickAddDefaults={{ calendarId: calendar?.id ?? null, dueDate: query.date }} />

      {error && <ErrorBanner message={error} onRetry={() => void reload()} onDismiss={dismissError} />}

      <div className="mb-5 shrink-0">
        <TaskFilters filters={filters} onChange={setFilters} sortMode={sortMode} onSortChange={setSortMode} calendars={calendars} hideCalendar={calendarId !== null} hideStatus={board || isCompleted || query.tab === 'overdue'} before={<CalendarsMenu />}>
          <Segmented
            label="Layout"
            value={board ? 'board' : 'list'}
            onChange={(next) => {
              setLayout(next);
              if (next === 'board' && query.tab !== 'all') go({ tab: 'all' });
            }}
            options={[
              { value: 'board', title: 'Board', label: <Columns3 className="mx-auto size-4" aria-hidden /> },
              { value: 'list', title: 'List', label: <List className="mx-auto size-4" aria-hidden /> },
            ]}
          />
          <Switch checked={hideRepeating} onChange={setHideRepeating}>
            Hide repeating reminders
          </Switch>
          <span className="ml-auto flex items-center">
            <Button variant={selecting ? 'secondary' : 'ghost'} icon={ListChecks} aria-pressed={selecting} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
              Select
            </Button>
            {board && (
              <Button variant="ghost" icon={History} onClick={() => go({ tab: 'completed' })}>
                Completed
              </Button>
            )}
          </span>
        </TaskFilters>
      </div>

      {!board && <Tabs label="Task lists" tabs={TASK_TABS} value={query.tab} onChange={(tab) => go({ tab })} className="mb-5 shrink-0" />}

      {selecting && (
        <div role="region" aria-label="Choose a calendar for the selected to-dos" className="mb-4 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-rule bg-surface px-4 py-2.5">
          <p className="mr-auto text-body">
            <span className="font-mono tabular-nums">{chosen.length}</span> selected
          </p>
          <Button variant="ghost" disabled={selectable.length === 0} onClick={() => setPicked(new Set(selectable.map((t) => t.id)))}>
            Select all {selectable.length}
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
        <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2 text-meta text-ink-muted">
          Showing
          {scope && <Chip onRemove={() => go({ calendarId: null })}>{scope}</Chip>}
          {query.date && <Chip onRemove={() => go({ date: null })}>Due {formatDueDate(query.date, today)}</Chip>}
        </div>
      )}

      {loading ? (
        <SkeletonRows count={6} />
      ) : board ? (
        nothingShown && filtering && inScope > 0 ? (
          <EmptyState message="No tasks match those filters.">{clearFilters}</EmptyState>
        ) : (
          <Board
            label="Tasks by when they are due"
            columns={boardDef}
            nameOf={(t) => t.title}
            startOn="today"
            onDrop={dropCard}
            renderCard={(t) => <TaskCard task={t} today={today} onMove={moveCard} select={selecting ? { picked: picked.has(t.id), onToggle: () => toggle(t.id) } : undefined} />}
          />
        )
      ) : (
        <div className="min-h-0 flex-1 md:overflow-y-auto">
          {mainTasks.length === 0 && doneTasks.length === 0 ? (
            filtering && inScope > 0 ? (
              <EmptyState message="No tasks match those filters.">{clearFilters}</EmptyState>
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
      )}

      <MoveDialog task={moving?.task ?? null} mode={moving?.mode ?? 'any'} today={today} onClose={() => setMoving(null)} onChoose={reschedule} />
    </div>
  );
}

/** What was finished today, tucked at the bottom of Due today until you open it. */
function DoneToday({ tasks, today, onMove }: { tasks: Task[]; today: string; onMove: (task: Task, how: MoveHow) => void }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-1.5 rounded-control px-1 text-meta font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent">
        <ChevronRight className={cx('size-4 transition-transform duration-150 ease-out', open && 'rotate-90')} aria-hidden />
        Done today <span className="font-mono text-time">{tasks.length}</span>
      </button>
      {open && (
        <div className="mt-2.5 space-y-2.5">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} today={today} onMove={onMove} />
          ))}
        </div>
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
