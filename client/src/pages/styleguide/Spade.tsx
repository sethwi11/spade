import type { CSSProperties, ReactNode } from 'react';
import { Briefcase, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Copy, CopyPlus, FileUp, GraduationCap, ListChecks, ListPlus, ListTodo, Menu as MenuIcon, MoreHorizontal, NotebookPen, Plus, Settings, Settings2, Timer } from 'lucide-react';
import type { CalendarColor } from '@todo/shared';
import { shadeProps, type Shade } from '../../lib/calendarColors';
import { cx } from '../../lib/cx';
import { formatCountdown, formatTime } from '../../lib/dates';
import { BlockText, blockPadding } from '../../ui/blocks';
import { Button, IconButton } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { calendarVars } from '../../lib/calendarColors';
import { Checkbox } from '../../ui/Checkbox';
import { QuickAddInput } from '../../ui/fields';
import { Menu, type MenuItem } from '../../ui/Menu';
import { SpadeMark } from '../../ui/SpadeMark';
import { Caption, Modes, Screen, Section } from './shared';

// Static mockups for the Spade redesign (a made-up Tuesday, never real data). Each is drawn at the real size and shrunk to fit.

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
// ---- the made-up day ----

interface Block { start: string; end: string; title: string; cat: string; color?: CalendarColor; shade: Shade }
const DAY: Block[] = [
  { start: '07:30', end: '08:30', title: 'Breakfast, get ready', cat: 'Personal', color: 'slate', shade: 'soft' },
  { start: '08:30', end: '09:45', title: 'Deep work: side project', cat: 'Skills', color: 'indigo', shade: 'soft' },
  { start: '10:00', end: '11:15', title: 'Statistics lecture', cat: 'School', color: 'dusty-blue', shade: 'solid' },
  { start: '11:15', end: '12:00', title: 'Open time', cat: 'Open time', shade: 'free' },
  { start: '12:00', end: '13:00', title: 'Lunch', cat: 'Personal', color: 'slate', shade: 'soft' },
  { start: '13:00', end: '15:00', title: 'Office hours', cat: 'Work', color: 'teal', shade: 'solid' },
];
const NOW = '08:40';
const NOW_BLOCK = DAY[1]!;
const range = (b: Block) => `${formatTime(b.start)} – ${formatTime(b.end)}`;

/** The time-scaled agenda, 1px a minute like the real one. The current-time line sits above the blocks and below their text, so it never strikes through a title. */
function MockAgenda({ from = 7 * 60, to = 13 * 60 }: { from?: number; to?: number }) {
  const GUTTER = '4.5rem';
  const y = (m: number) => m - from;
  const hours = Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60);
  return (
    <div className="relative mt-2" style={{ height: y(to) }}>
      {hours.map((m) => (
        <div key={m} className="absolute inset-x-0 border-t border-hairline" style={{ top: y(m) }}>
          <span className="absolute -top-2 left-0 bg-paper pr-2 font-mono text-time text-ink-muted">{formatTime(`${String(Math.floor(m / 60)).padStart(2, '0')}:00`)}</span>
        </div>
      ))}
      {DAY.filter((b) => mins(b.end) > from && mins(b.start) < to).map((b) => {
        const minutes = mins(b.end) - mins(b.start);
        const look = shadeProps(b.color ?? null, b.shade);
        const current = mins(b.start) <= mins(NOW) && mins(NOW) < mins(b.end);
        return (
          <div
            key={b.start}
            style={{ ...look.style, top: y(mins(b.start)), height: minutes - 2, left: GUTTER, right: 0 }}
            className={cx('absolute overflow-hidden rounded-control text-ink', blockPadding(minutes), look.className, mins(b.end) <= mins(NOW) && 'opacity-60', current && 'outline-2 outline-offset-1 outline-accent', b.shade === 'free' && 'text-ink-muted')}
          >
            {/* The label sits above the line on a plate in the block's own color, so the line passes under it and never strikes through a letter. */}
            <div className="relative z-10 w-fit max-w-full" style={{ backgroundColor: b.shade === 'free' ? 'var(--paper)' : b.shade === 'solid' ? 'var(--c-strong)' : 'var(--c-soft)' }}>
              <BlockText title={b.title} detail={b.cat} time={range(b)} minutes={minutes} />
            </div>
          </div>
        );
      })}
      <div aria-hidden className="absolute right-0 z-[5] h-0.5 bg-accent" style={{ top: y(mins(NOW)), left: `calc(${GUTTER} - 0.5rem)` }}>
        <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-accent" />
      </div>
    </div>
  );
}

const Legend = () => (
  <ul aria-label="Categories today" className="flex flex-wrap gap-x-4 gap-y-1.5 text-meta text-ink-muted">
    {(
      [
        ['Personal', 'slate'],
        ['Skills', 'indigo'],
        ['School', 'dusty-blue'],
        ['Work', 'teal'],
      ] as const
    ).map(([name, c]) => (
      <li key={name} className="inline-flex items-center gap-1.5">
        <span style={{ background: `var(--cal-${c})` }} className="size-3 rounded-[2px]" />
        {name}
      </li>
    ))}
    <li className="inline-flex items-center gap-1.5">
      <span style={{ '--c': 'var(--rule)' } as CSSProperties} className="hatch size-3 rounded-[2px]" />
      Free and open
    </li>
  </ul>
);

function TaskLines({ title, tasks, big = false }: { title: string; tasks: [string, string][]; big?: boolean }) {
  return (
    <div>
      <h3 className="mb-1 text-label text-ink-muted uppercase">{title}</h3>
      <ul>
        {tasks.map(([t, due]) => (
          <li key={t} className="flex items-center gap-1">
            <Checkbox checked={false} onChange={() => {}} label={`Mark "${t}" as done`} />
            <span className={big ? 'text-title' : 'text-body'}>
              {t}
              <span className="text-meta text-ink-muted"> · due {due}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- the home screen ----

const left = mins(NOW_BLOCK.end) - mins(NOW);
const share = 1 - left / (mins(NOW_BLOCK.end) - mins(NOW_BLOCK.start));

/** The three buttons under the Now card: Start focus only on a focus block; Add task and Add event always. */
const Actions = ({ focus = true, big = false }: { focus?: boolean; big?: boolean }) => {
  const size = big ? 'h-11 px-5 text-title' : undefined;
  return (
    <div className="flex flex-wrap gap-2">
      {focus && (
        <Button variant="primary" icon={Timer} className={size}>
          Start focus · 25 min
        </Button>
      )}
      <Button variant="primary" icon={ListPlus} className={size}>
        Add task
      </Button>
      <Button variant="primary" icon={CalendarPlus} className={size}>
        Add event
      </Button>
    </div>
  );
};

function HomeDesktop() {
  return (
    <div className="flex h-full flex-col px-10 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[5.5rem] leading-none tabular-nums">{formatTime(NOW)}</p>
          <p className="mt-2 font-display text-section text-ink-muted">Tuesday, November 10</p>
        </div>
        <Button variant="secondary" icon={MenuIcon}>
          Menu
        </Button>
      </header>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-8">
        <div className="flex min-h-0 flex-col gap-6">
          <section aria-label="Now" style={{ '--c': 'var(--cal-indigo)' } as CSSProperties} className="rounded-panel border border-rule border-l-8 border-l-(color:--c) bg-surface px-8 py-7">
            <h2 className="text-label text-ink-muted uppercase">Now · {NOW_BLOCK.cat}</h2>
            <p className="mt-2 font-display text-[3.5rem] leading-tight">{NOW_BLOCK.title}</p>
            <p className="mt-3 font-mono text-[2.25rem] tabular-nums">
              {formatCountdown(left * 60_000)} left <span className="text-ink-muted">· until {formatTime(NOW_BLOCK.end)}</span>
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-hairline">
              <div className="h-full rounded-full bg-(color:--c)" style={{ width: `${share * 100}%` }} />
            </div>
            <p className="mt-5 text-title text-ink-muted">
              Next · <span className="text-ink">Statistics lecture</span> at {formatTime('10:00')}
            </p>
          </section>
          <Actions big />
          <TaskLines big title="During this block" tasks={[['Outline the project README', 'Today'], ['Fix the date bug', 'Friday']]} />
        </div>
        <section aria-label="Agenda" className="flex min-h-0 flex-col overflow-hidden">
          <Legend />
          <div className="mt-4 min-h-0 flex-1 overflow-hidden pr-2">
            <MockAgenda to={17 * 60} />
          </div>
        </section>
      </div>
    </div>
  );
}

function HomePhone() {
  return (
    <div className="flex h-full flex-col px-5 py-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[3.25rem] leading-none tabular-nums">{formatTime(NOW)}</p>
          <p className="mt-1.5 font-display text-title text-ink-muted">Tuesday, November 10</p>
        </div>
        <Button variant="secondary" icon={MenuIcon}>
          Menu
        </Button>
      </header>
      <section aria-label="Now" style={{ '--c': 'var(--cal-indigo)' } as CSSProperties} className="mt-5 rounded-panel border border-rule border-l-8 border-l-(color:--c) bg-surface px-4 py-4">
        <h2 className="text-label text-ink-muted uppercase">Now · {NOW_BLOCK.cat}</h2>
        <p className="mt-1 font-display text-[1.75rem] leading-tight">{NOW_BLOCK.title}</p>
        <p className="mt-2 font-mono text-[1.5rem] leading-tight tabular-nums">{formatCountdown(left * 60_000)} left</p>
        <p className="font-mono text-meta text-ink-muted tabular-nums">until {formatTime(NOW_BLOCK.end)}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-hairline">
          <div className="h-full rounded-full bg-(color:--c)" style={{ width: `${share * 100}%` }} />
        </div>
      </section>
      <div className="mt-4">
        <Actions />
      </div>
      <div className="mt-5 min-h-0 flex-1 overflow-hidden">
        <Legend />
        <div className="mt-3">
          <MockAgenda from={7 * 60} to={12 * 60} />
        </div>
      </div>
    </div>
  );
}

// ---- the rail ----

const NAV = [
  { label: 'Today', icon: CalendarCheck, count: 3 },
  { label: 'Calendar', icon: CalendarDays, count: 0 },
  { label: 'Tasks', icon: ListTodo, count: 0 },
  { label: 'Applications', icon: Briefcase, count: 2 },
  { label: 'Courses', icon: GraduationCap, count: 0 },
  { label: 'Journal', icon: NotebookPen, count: 0 },
];

/** The count on an icon: honey on the rail, cerulean on the honey tile of the active page. */
const Badge = ({ n, active }: { n: number; active: boolean }) => (
  <span className={cx('absolute -top-1.5 -right-3 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[10px] leading-none font-medium', active ? 'bg-rail text-accent-fill' : 'bg-accent-fill text-on-accent-fill')}>{n}</span>
);

function Rail({ active }: { active: string }) {
  const item = (label: string, Icon: typeof Settings, count: number) => {
    const on = label === active;
    return (
      <a href="#spade" aria-current={on ? 'page' : undefined} className={cx('flex flex-col items-center gap-1 rounded-control px-1 py-2.5 text-time leading-none font-medium', on ? 'bg-accent-fill text-on-accent-fill' : 'text-on-rail-muted hover:bg-rail-hover hover:text-on-rail')}>
        <span className="relative">
          <Icon className="size-[22px]" aria-hidden />
          {count > 0 && <Badge n={count} active={on} />}
        </span>
        {label}
      </a>
    );
  };
  return (
    <nav aria-label="Main" className="flex h-full w-22 shrink-0 flex-col items-center bg-rail py-4 text-on-rail">
      <a href="#spade" aria-label="Spade home" className="mb-5 grid size-11 place-items-center rounded-control text-accent-fill hover:bg-rail-hover">
        <SpadeMark className="size-8" />
      </a>
      <ul className="flex w-full flex-col gap-1 px-2">
        {NAV.map((n) => (
          <li key={n.label}>{item(n.label, n.icon, n.count)}</li>
        ))}
      </ul>
      <div className="mt-auto w-full border-t border-rail-rule px-2 pt-3">{item('Settings', Settings, 0)}</div>
    </nav>
  );
}

// ---- the New button ----

const NEW_ITEMS: MenuItem[] = [
  { label: 'Task (full form)', icon: ListPlus },
  { label: 'Event', icon: CalendarPlus },
  { label: 'Application', icon: Briefcase },
  { label: 'Import file', icon: FileUp },
];

/** The honey square at the end of the quick-add bar: a plus and a chevron, so it reads as a menu. */
const newTrigger = (props: object) => (
  <button type="button" aria-label="New" title="New: task, event, application, or a file to import" className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-control bg-accent-fill pr-1.5 pl-2 text-on-accent-fill transition-colors duration-150 ease-out hover:bg-accent-fill/85" {...props}>
    <Plus className="size-4" aria-hidden />
    <ChevronDown className="size-3.5" aria-hidden />
  </button>
);

const QuickBar = ({ className, menu }: { className?: string; menu?: ReactNode }) => (
  <div className={cx('flex items-center gap-2', className)}>
    <QuickAddInput aria-label="Add a task" placeholder="Add a task…" shortcut="N" className="min-w-0 flex-1" />
    {menu ?? <span className="inline-flex h-8 items-center gap-0.5 rounded-control bg-accent-fill pr-1.5 pl-2 text-on-accent-fill"><Plus className="size-4" aria-hidden /><ChevronDown className="size-3.5" aria-hidden /></span>}
  </div>
);

/** The open menu, drawn flat for the picture. */
const OpenMenu = () => (
  <div role="presentation" className="w-52 rounded-panel border border-hairline bg-surface p-1 shadow-popover">
    {NEW_ITEMS.map(({ label, icon: Icon }, i) => (
      <div key={label} className={cx('flex h-8 items-center gap-2 rounded-control px-2 text-body', i === 0 && 'bg-accent-soft')}>
        {Icon && <Icon className="size-4" aria-hidden />}
        {label}
      </div>
    ))}
  </div>
);

// ---- Today beside the rail, and on a phone ----

function TodayWithRail() {
  return (
    <div className="flex h-full">
      <Rail active="Today" />
      <div className="min-w-0 flex-1 px-10 pt-10">
        <div className="flex items-end justify-between gap-8">
          <div>
            <h1 className="font-display text-page">Tuesday</h1>
            <p className="font-display text-section text-ink-muted">
              November 10 <span className="ml-3 font-mono text-meta">WK 46</span>
            </p>
          </div>
          <QuickBar className="w-80" />
        </div>
        <p className="mt-6 mb-5 text-meta text-ink-muted">
          <span className="font-mono text-ink">4</span> events · <span className="font-mono text-ink">3</span> tasks
        </p>
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-14">
          <div className="h-80 overflow-hidden">
            <MockAgenda from={7 * 60} to={12 * 60} />
          </div>
          <div className="space-y-6">
            <TaskLines title="To-dos" tasks={[['Outline the project README', 'Today'], ['Read chapter 6', 'Today'], ['Email Dr. Rivera', 'Tomorrow']]} />
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { label: 'Today', icon: CalendarCheck, count: 3 },
  { label: 'Calendar', icon: CalendarDays, count: 0 },
  { label: 'Tasks', icon: ListTodo, count: 0 },
  { label: 'Apps', icon: Briefcase, count: 2 },
  { label: 'Courses', icon: GraduationCap, count: 0 },
  { label: 'Journal', icon: NotebookPen, count: 0 },
  { label: 'Settings', icon: Settings, count: 0 },
];

function TodayPhone() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-4">
        <SpadeMark className="size-6" />
        <span className="font-display text-section italic">Spade</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-5 pt-6">
        <h1 className="font-display text-page">Tuesday</h1>
        <p className="font-display text-section text-ink-muted">November 10</p>
        <QuickBar className="mt-5" />
        <div className="mt-6">
          <TaskLines title="To-dos" tasks={[['Outline the project README', 'Today'], ['Read chapter 6', 'Today'], ['Email Dr. Rivera', 'Tomorrow']]} />
        </div>
      </div>
      <nav aria-label="Main" className="flex shrink-0 bg-rail px-1 pt-1.5 pb-2.5">
        {TABS.map(({ label, icon: Icon, count }) => {
          const on = label === 'Today';
          return (
            <a key={label} href="#spade" aria-current={on ? 'page' : undefined} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-time leading-none font-medium">
              <span className={cx('grid h-7 w-12 place-items-center rounded-control', on ? 'bg-accent-fill text-on-accent-fill' : 'text-on-rail-muted')}>
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {count > 0 && <Badge n={count} active={on} />}
                </span>
              </span>
              <span className={on ? 'text-on-rail' : 'text-on-rail-muted'}>{label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}


// ---- the Calendar page header ----

const CALENDARS: { name: string; color: CalendarColor; count: number; shown: boolean }[] = [
  { name: 'School', color: 'dusty-blue', count: 4, shown: true },
  { name: 'Work', color: 'slate', count: 2, shown: true },
  { name: 'Applications', color: 'tomato', count: 5, shown: true },
  { name: 'Clubs', color: 'sage', count: 1, shown: false },
  { name: 'Personal', color: 'plum', count: 3, shown: true },
  { name: 'Skills', color: 'indigo', count: 2, shown: true },
  { name: 'Health', color: 'ochre', count: 0, shown: false },
  { name: 'Reading', color: 'rose', count: 1, shown: true },
  { name: 'Faith', color: 'teal', count: 0, shown: false },
];

/** The old sidebar list, in a dropdown: the square shows or hides the calendar, the name filters Tasks, ⋯ edits it, + adds one. */
const CalendarsPanel = () => (
  <div className="w-72 rounded-panel border border-hairline bg-surface p-2 shadow-popover">
    <div className="flex items-center justify-between pr-1 pl-2">
      <span className="text-label text-ink-muted uppercase">Calendars</span>
      <IconButton icon={Plus} label="New calendar" className="size-6" />
    </div>
    <ul className="mt-1">
      {CALENDARS.map((c, i) => (
        <li key={c.name} style={calendarVars(c.color)} className={cx('flex items-center rounded-control', i === 2 && 'bg-accent-soft')}>
          <span className="grid size-8 shrink-0 place-items-center">
            <span className={cx('size-2.5 border-[1.5px] border-(color:--c)', c.shown ? 'bg-(color:--c)' : 'bg-transparent')} />
          </span>
          <span className={cx('min-w-0 flex-1 truncate text-body', !c.shown && 'text-ink-muted')}>{c.name}</span>
          {c.count > 0 && <span className="font-mono text-meta text-ink-muted tabular-nums">{c.count}</span>}
          <IconButton icon={MoreHorizontal} label={`Edit ${c.name}`} />
        </li>
      ))}
    </ul>
  </div>
);

const ROUTINE_MENU = [
  { label: 'New routine block…', icon: Plus },
  { label: 'Week template…', icon: Settings2 },
  { label: 'Duplicate for a new semester…', icon: CopyPlus },
  { label: 'Copy a day to other days…', icon: Copy },
];

const RoutinePanel = () => (
  <div role="presentation" className="w-72 rounded-panel border border-hairline bg-surface p-1 shadow-popover">
    {ROUTINE_MENU.map(({ label, icon: Icon }, i) => (
      <div key={label} className={cx('flex h-8 items-center gap-2 rounded-control px-2 text-body', i === 0 && 'bg-accent-soft')}>
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
    ))}
  </div>
);

const layer = (on: boolean) => cx('inline-flex h-8 items-center justify-center gap-1.5 rounded-control border px-2.5 text-body', on ? 'border-ink text-ink' : 'border-rule text-ink-muted');

function CalendarHeaderMock({ open }: { open: 'calendars' | 'routine' }) {
  return (
    <div className="px-8 pt-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="mr-auto font-display text-section">Nov 8 – 14, 2026</h1>
        <div className="flex items-center gap-1">
          <Button variant="secondary">Today</Button>
          <IconButton icon={ChevronLeft} label="Previous week" />
          <IconButton icon={ChevronRight} label="Next week" />
        </div>
        <Segmented
          label="Calendar view"
          value="week"
          onChange={() => {}}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'day', label: 'Day' },
            { value: 'agenda', label: 'Agenda' },
          ]}
        />
        <div className="flex items-center gap-1">
          <span className={layer(true)}><CalendarDays className="size-4" aria-hidden />Events</span>
          <span className={layer(true)}><ListChecks className="size-4" aria-hidden />To-dos</span>
          <span className={layer(true)}><CalendarClock className="size-4" aria-hidden />Time blocks</span>
          {/* The Routine switch keeps its job; the chevron beside it opens the routine's menu. */}
          <span className="relative inline-flex">
            <span className={cx(layer(true), 'rounded-r-none')}><CalendarRange className="size-4" aria-hidden />Routine</span>
            <span aria-label="Routine options" className={cx(layer(true), 'rounded-l-none border-l-0 px-1.5', open === 'routine' && 'bg-accent-soft')}><ChevronDown className="size-4" aria-hidden /></span>
            {open === 'routine' && <span className="absolute top-full right-0 z-10 mt-1"><RoutinePanel /></span>}
          </span>
        </div>
        <span className="relative">
          <span className={cx('inline-flex h-8 items-center gap-2 rounded-control border border-ink px-3 text-body font-medium', open === 'calendars' && 'bg-accent-soft')}>
            Calendars <span className="text-ink-muted">· 3 hidden</span>
            <ChevronDown className="size-4" aria-hidden />
          </span>
          {open === 'calendars' && <span className="absolute top-full left-0 z-10 mt-1"><CalendarsPanel /></span>}
        </span>
        <Button variant="primary" icon={CalendarPlus}>
          Add event
        </Button>
      </header>
      <div className="mt-4 grid grid-cols-7 border-t border-l border-hairline">
        {['Sun 8', 'Mon 9', 'Tue 10', 'Wed 11', 'Thu 12', 'Fri 13', 'Sat 14'].map((d) => (
          <div key={d} className="h-48 border-r border-b border-hairline px-2 py-1.5 text-label text-ink-muted uppercase">
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- the mark ----

function MarkSheet() {
  return (
    <div className="flex flex-wrap items-start gap-8">
      <div>
        <Caption>The app icon</Caption>
        <div className="grid size-40 place-items-center rounded-[36px] bg-rail text-accent-fill">
          <SpadeMark className="size-24" />
        </div>
      </div>
      <div>
        <Caption>On the rail, small and large</Caption>
        <div className="flex items-end gap-4 rounded-panel bg-rail p-4 text-accent-fill">
          {[16, 24, 32, 48, 64].map((s) => (
            <span key={s} className="block shrink-0" style={{ width: s, height: s }}>
              <SpadeMark className="size-full" />
            </span>
          ))}
        </div>
      </div>
      <div>
        <Caption>On the page</Caption>
        <div className="flex items-end gap-4 rounded-panel border border-hairline bg-paper p-4 text-ink">
          <SpadeMark className="size-8" />
          <span className="font-display text-section italic">Spade</span>
        </div>
      </div>
    </div>
  );
}

export function Spade() {
  return (
    <Section id="spade" title="Spade mockups: home screen, icon rail, New button" intro="The redesign as it was drawn before it was built, with made-up data, kept as a record. Each is drawn at full size and shrunk to fit, in both modes.">
      <div id="spade-mark">
        <h3 className="mb-2 text-label text-ink-muted uppercase">The mark</h3>
        <MarkSheet />
        <Caption>A plain spade in honey on deep cerulean. The same shape is the favicon and the installed app icon.</Caption>
      </div>

      <div id="spade-home">
        <h3 className="mb-2 text-label text-ink-muted uppercase">Home screen (what Spade opens to)</h3>
        <Modes>
          <Screen w={1280} h={720} scale={0.68} label="Home screen on a desktop">
            <HomeDesktop />
          </Screen>
        </Modes>
      </div>

      <div id="spade-home-phone">
        <h3 className="mb-2 text-label text-ink-muted uppercase">Home screen on a phone</h3>
        <Modes row>
          <Screen w={390} h={780} label="Home screen on a phone">
            <HomePhone />
          </Screen>
        </Modes>
      </div>

      <div id="spade-rail">
        <h3 className="mb-2 text-label text-ink-muted uppercase">Icon rail, with Today open</h3>
        <Modes>
          <Screen w={1280} h={640} scale={0.68} label="Today with the icon rail">
            <TodayWithRail />
          </Screen>
        </Modes>
      </div>

      <div id="spade-tabs">
        <h3 className="mb-2 text-label text-ink-muted uppercase">On a phone the rail becomes a tab bar</h3>
        <Modes row>
          <Screen w={390} h={640} label="Today on a phone with the tab bar">
            <TodayPhone />
          </Screen>
        </Modes>
      </div>

      <div id="spade-calendar">
        <h3 className="mb-2 text-label text-ink-muted uppercase">Calendar page: Calendars dropdown, Add event, and the Routine menu</h3>
        <Modes>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-meta text-ink-muted">Calendars dropdown, open</p>
              <Screen w={1192} h={560} scale={0.72} label="Calendar page with the Calendars dropdown open">
                <CalendarHeaderMock open="calendars" />
              </Screen>
            </div>
            <div>
              <p className="mb-2 text-meta text-ink-muted">Routine menu, open</p>
              <Screen w={1192} h={330} scale={0.72} label="Calendar page with the Routine menu open">
                <CalendarHeaderMock open="routine" />
              </Screen>
            </div>
          </div>
        </Modes>
        <Caption>The same Calendars button sits in the Tasks page header (picking a name filters the list there). Routine blocks and the week template are edited here, so the Week page can stay hidden.</Caption>
      </div>

      <div id="spade-new">
        <h3 className="mb-2 text-label text-ink-muted uppercase">The New button</h3>
        <Modes row>
          <div className="w-80 space-y-1">
            <QuickBar />
            <div className="flex justify-end">
              <OpenMenu />
            </div>
          </div>
        </Modes>
        <div className="mt-6 max-w-80">
          <Caption>Try it</Caption>
          <QuickBar menu={<Menu align="end" items={NEW_ITEMS} trigger={newTrigger} />} />
          <p className="mt-3 max-w-[44ch] text-meta text-ink-muted">Typing a title and pressing Enter still adds a task, and N still jumps to the bar. The menu has no Expense while Money is hidden.</p>
        </div>
      </div>
    </Section>
  );
}
