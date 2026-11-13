import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowUpDown,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  Columns3,
  Filter,
  GraduationCap,
  History,
  List,
  ListChecks,
  ListTodo,
  MoreHorizontal,
  NotebookPen,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Repeat,
  Search,
  Settings,
  SlidersHorizontal,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { CalendarColor } from '@todo/shared';
import { calendarVars } from '../../lib/calendarColors';
import { cx } from '../../lib/cx';
import { SpadeMark } from '../../ui/SpadeMark';
import { Modes, Screen, Section } from './shared';

// Static mockups for the side rail, the Tasks board and the Applications board (made-up data, never real). Drawn at real size; the boards are shrunk to fit.

const Sub = ({ children }: { children: ReactNode }) => <h3 className="mb-2 text-label text-ink-muted uppercase">{children}</h3>;

// ============ shared bits: cards, chips, columns ============

const card = 'group relative rounded-card border border-hairline bg-card p-4 shadow-card';

/** A small pill: a category (color dot), a time or day (icon), or a status. */
function Chip({ children, icon: Icon, color, tone = 'plain' }: { children: ReactNode; icon?: LucideIcon; color?: CalendarColor; tone?: 'plain' | 'danger' | 'honey' | 'green' }) {
  return (
    <span
      style={color ? calendarVars(color) : undefined}
      className={cx(
        'inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2 text-meta whitespace-nowrap text-ink',
        tone === 'plain' && 'bg-well',
        tone === 'danger' && 'bg-danger/12',
        tone === 'honey' && 'bg-accent-fill/25',
        tone === 'green' && 'bg-success/15',
      )}
    >
      {color && <span aria-hidden className="size-2 shrink-0 rounded-full bg-(color:--c)" />}
      {Icon && <Icon className={cx('size-3.5 shrink-0', tone === 'danger' ? 'text-danger' : tone === 'honey' ? 'text-accent-ink' : tone === 'green' ? 'text-success' : 'text-ink-muted')} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

const RoundCheck = ({ done = false }: { done?: boolean }) => (
  <span aria-hidden className={cx('mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]', done ? 'border-ink bg-ink text-paper' : 'border-ink-muted')}>
    {done && <Check className="size-3" strokeWidth={3} />}
  </span>
);

const IconBtn = ({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className?: string }) => (
  <span role="img" aria-label={label} className={cx('grid size-7 shrink-0 place-items-center rounded-control text-ink-muted', className)}>
    <Icon className="size-4" aria-hidden />
  </span>
);

/** A board column: a well with a header (dot, name, count, optional + and ...), cards, and an Add link at the bottom. */
function Column({ dot, name, count, add, plus = false, children, className }: { dot: string; name: string; count: number; add?: string; plus?: boolean; children: ReactNode; className?: string }) {
  return (
    <section aria-label={name} className={cx('flex min-h-0 min-w-0 flex-col rounded-2xl bg-well p-2.5', className)}>
      <header className="mb-2.5 flex items-center gap-2 pl-1.5">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} />
        <h4 className="truncate text-body font-semibold text-ink">{name}</h4>
        <span className="rounded-full bg-card px-2 font-mono text-time text-ink-muted tabular-nums">{count}</span>
        <span className="ml-auto flex shrink-0">
          {plus && <IconBtn icon={Plus} label={`Add to ${name}`} />}
          <IconBtn icon={MoreHorizontal} label={`${name} options`} />
        </span>
      </header>
      {/* The list scrolls on its own; the fade and bottom padding show there is more below. */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden pb-7 [mask-image:linear-gradient(to_bottom,var(--ink)_calc(100%-32px),transparent)]">{children}</div>
      {add && (
        <span className="mt-3 inline-flex items-center gap-1.5 px-1 text-body font-medium text-accent-ink">
          <Plus className="size-4" aria-hidden />
          {add}
        </span>
      )}
    </section>
  );
}

const Tool = ({ icon: Icon, children, ghost = false }: { icon?: LucideIcon; children: ReactNode; ghost?: boolean }) => (
  <span className={cx('inline-flex h-8 items-center gap-2 rounded-control px-3 text-body whitespace-nowrap', ghost ? 'text-ink-muted' : 'border border-rule text-ink')}>
    {Icon && <Icon className="size-4" aria-hidden />}
    {children}
  </span>
);

const Search_ = ({ w = 'w-44' }: { w?: string }) => (
  <span className={cx('inline-flex h-8 items-center gap-2 rounded-control border border-rule bg-card px-3 text-body text-ink-muted', w)}>
    <Search className="size-4" aria-hidden />
    Search
  </span>
);

const Switch_ = ({ on = false, children }: { on?: boolean; children: ReactNode }) => (
  <span className="inline-flex h-8 items-center gap-2 text-body text-ink">
    <span aria-hidden className={cx('relative h-[18px] w-8 rounded-full transition-colors', on ? 'bg-accent-fill' : 'bg-rule')}>
      <span className={cx('absolute top-0.5 size-3.5 rounded-full bg-card shadow-card', on ? 'left-[16px]' : 'left-0.5')} />
    </span>
    {children}
  </span>
);

const Seg = ({ items, value }: { items: readonly [string, LucideIcon][]; value: string }) => (
  <span role="img" aria-label="View" className="inline-flex h-8 overflow-hidden rounded-control border border-rule">
    {items.map(([label, Icon], i) => (
      <span key={i} className={cx('inline-flex items-center gap-2 border-l border-rule px-3 text-body first:border-l-0', label === value ? 'bg-ink text-paper' : 'text-ink')}>
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
    ))}
  </span>
);

/** The quick-add bar and its honey New button, as in every page header. */
const QuickBar = () => (
  <span className="flex items-center gap-2">
    <span className="flex h-9 w-72 items-center border-b border-rule text-body text-ink-muted">
      Add a task…<kbd className="ml-auto font-mono text-time">N</kbd>
    </span>
    <span className="inline-flex h-8 items-center gap-0.5 rounded-control bg-accent-fill pr-1.5 pl-2 text-on-accent-fill">
      <Plus className="size-4" aria-hidden />
      <ChevronDown className="size-3.5" aria-hidden />
    </span>
  </span>
);

// ============ the rail ============

const NAV: readonly [string, LucideIcon, number][] = [
  ['Today', CalendarCheck, 6],
  ['Calendar', CalendarDays, 0],
  ['Tasks', ListTodo, 0],
  ['Applications', Briefcase, 2],
  ['Courses', GraduationCap, 0],
  ['Journal', NotebookPen, 0],
];
type State = 'idle' | 'active' | 'hover' | 'focus';

/** What a mockup page looks like beside a rail: a title and three cards, so you can judge the edge. */
const PageStrip = () => (
  <div className="min-w-0 flex-1 bg-paper p-4">
    <div className="mb-4 h-6 w-24 rounded-control bg-hairline" />
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-card border border-hairline bg-card shadow-card" />
      ))}
    </div>
  </div>
);

const Badge = ({ n, size = 18 }: { n: number; size?: number }) => (
  <span style={{ height: size, minWidth: size }} className="grid place-items-center rounded-full bg-accent-fill px-1 font-mono text-[11px] leading-none font-medium text-on-accent-fill">
    {n}
  </span>
);

/** Direction A and C (collapsed): the icon sits in a pill; the honey-tinted pill and a small edge bar mark where you are. */
function RailItem({ label, icon: Icon, count, state, paper = false }: { label: string; icon: LucideIcon; count: number; state: State; paper?: boolean }) {
  const on = state === 'active';
  return (
    <li className="relative">
      {on && <span aria-hidden className={cx('absolute top-4 left-0 h-8 w-1 rounded-r-full', paper ? 'bg-accent' : 'bg-accent-fill')} />}
      <span className="flex h-16 flex-col items-center justify-center gap-1">
        <span
          className={cx(
            'relative grid h-8 w-12 place-items-center rounded-full',
            on ? (paper ? 'bg-accent-fill/30 text-accent-ink' : 'bg-accent-fill/25 text-accent-fill') : paper ? 'text-ink' : 'text-on-rail',
            state === 'hover' && (paper ? 'bg-ink/8' : 'bg-on-rail/10'),
            state === 'focus' && 'outline-2 outline-offset-2 outline-accent-fill',
          )}
        >
          <Icon className="size-[22px]" strokeWidth={1.75} aria-hidden />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2.5">
              <Badge n={count} />
            </span>
          )}
        </span>
        <span className={cx('text-[12px] leading-none', on ? (paper ? 'font-semibold text-ink' : 'font-semibold text-on-rail') : paper ? 'font-medium text-ink-muted' : 'font-medium text-on-rail-muted')}>{label}</span>
      </span>
    </li>
  );
}

const RAIL_GRADIENT: CSSProperties = { background: 'linear-gradient(180deg, color-mix(in srgb, var(--rail), var(--on-rail) 8%) 0%, var(--rail) 60%)', boxShadow: 'inset -1px 0 0 var(--rail-rule)' };

/** A: the compact rail, items grouped at the top, Settings pinned at the bottom. B: the same on the page's own surface. */
function CompactRail({ paper = false }: { paper?: boolean }) {
  return (
    <nav aria-label="Main" style={paper ? undefined : RAIL_GRADIENT} className={cx('flex w-22 shrink-0 flex-col items-center py-5', paper ? 'border-r border-hairline bg-card' : 'text-on-rail')}>
      {paper ? (
        <span className="grid size-10 place-items-center rounded-[12px] bg-rail text-accent-fill">
          <SpadeMark className="size-6" />
        </span>
      ) : (
        <SpadeMark className="size-9 text-accent-fill" />
      )}
      <ul className="mt-6 w-full">
        {NAV.map(([label, icon, count]) => (
          <RailItem key={label} label={label} icon={icon} count={count} paper={paper} state={label === 'Tasks' ? 'active' : label === 'Calendar' ? 'hover' : label === 'Courses' ? 'focus' : 'idle'} />
        ))}
      </ul>
      <div className={cx('mt-auto w-full border-t pt-2', paper ? 'border-hairline' : 'border-rail-rule')}>
        <ul>
          <RailItem label="Settings" icon={Settings} count={0} paper={paper} state="idle" />
        </ul>
      </div>
    </nav>
  );
}

/** C when pinned open: a labeled sidebar with Main and Settings sections. */
function ExpandedRail() {
  const row = (label: string, Icon: LucideIcon, count: number, state: State) => {
    const on = state === 'active';
    return (
      <li key={label} className="relative">
        {on && <span aria-hidden className="absolute top-2 left-0 h-7 w-1 rounded-r-full bg-accent-fill" />}
        <span className={cx('mx-3 flex h-11 items-center gap-3 rounded-xl px-3 text-body', on ? 'bg-accent-fill/25 font-semibold text-on-rail' : state === 'hover' ? 'bg-on-rail/10 font-medium text-on-rail' : 'font-medium text-on-rail-muted')}>
          <Icon className={cx('size-[22px] shrink-0', on ? 'text-accent-fill' : 'text-on-rail')} strokeWidth={1.75} aria-hidden />
          <span className="flex-1">{label}</span>
          {count > 0 && <Badge n={count} size={20} />}
        </span>
      </li>
    );
  };
  return (
    <nav aria-label="Main" style={RAIL_GRADIENT} className="flex w-58 shrink-0 flex-col py-5 text-on-rail">
      <div className="flex items-center gap-2.5 px-5">
        <SpadeMark className="size-9 text-accent-fill" />
        <span className="font-display text-section italic">Spade</span>
        <span className="ml-auto grid size-8 place-items-center rounded-control text-on-rail-muted">
          <PanelLeftClose className="size-[18px]" aria-hidden />
        </span>
      </div>
      <h4 className="mt-6 mb-1 px-6 text-label text-on-rail-muted uppercase">Main</h4>
      <ul>{NAV.map(([label, icon, count]) => row(label, icon, count, label === 'Tasks' ? 'active' : label === 'Calendar' ? 'hover' : 'idle'))}</ul>
      <div className="mt-auto">
        <h4 className="mb-1 px-6 text-label text-on-rail-muted uppercase">Settings</h4>
        <ul>
          {row('Settings', Settings, 0, 'idle')}
          <li>
            <span className="mx-3 flex h-11 items-center gap-3 rounded-xl px-3 text-body font-medium text-on-rail-muted">
              <Pin className="size-[22px] shrink-0 text-on-rail" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">Keep open</span>
              <span aria-hidden className="relative h-[18px] w-8 rounded-full bg-accent-fill">
                <span className="absolute top-0.5 left-[16px] size-3.5 rounded-full bg-rail" />
              </span>
            </span>
          </li>
        </ul>
      </div>
    </nav>
  );
}

/** C when tucked away: the compact rail with a way to open it. */
function CollapsedRailC() {
  return (
    <nav aria-label="Main" style={RAIL_GRADIENT} className="flex w-22 shrink-0 flex-col items-center py-5 text-on-rail">
      <SpadeMark className="size-9 text-accent-fill" />
      <span className="mt-3 grid size-8 place-items-center rounded-control text-on-rail-muted">
        <PanelLeftOpen className="size-[18px]" aria-hidden />
      </span>
      <ul className="mt-3 w-full">
        {NAV.map(([label, icon, count]) => (
          <RailItem key={label} label={label} icon={icon} count={count} state={label === 'Tasks' ? 'active' : 'idle'} />
        ))}
      </ul>
      <div className="mt-auto w-full border-t border-rail-rule pt-2">
        <ul>
          <RailItem label="Settings" icon={Settings} count={0} state="idle" />
        </ul>
      </div>
    </nav>
  );
}

const Frame = ({ children, label }: { children: ReactNode; label: string }) => (
  <div>
    <div role="img" aria-label={label} className="flex h-[560px] overflow-hidden rounded-panel border border-hairline bg-paper">
      <div inert className="flex size-full">
        {children}
      </div>
    </div>
    <p className="mt-2 text-meta text-ink-muted">{label}</p>
  </div>
);

function RailDirections() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Frame label="A · Compact pill: cerulean, honey-tinted pill and an edge bar. Hover on Calendar, keyboard focus on Courses.">
        <CompactRail />
        <PageStrip />
      </Frame>
      <Frame label="B · Paper: the rail on the page's own surface, with a hairline edge.">
        <CompactRail paper />
        <PageStrip />
      </Frame>
      <Frame label="C · Tucked away: the compact rail, with a button that opens it.">
        <CollapsedRailC />
        <PageStrip />
      </Frame>
      <Frame label="C · Opened: a labeled sidebar with Main and Settings, kept open if you pin it.">
        <ExpandedRail />
        <div className="min-w-0 flex-1 bg-paper p-4">
          <div className="mb-4 h-6 w-24 rounded-control bg-hairline" />
          <div className="h-16 rounded-card border border-hairline bg-card shadow-card" />
        </div>
      </Frame>
    </div>
  );
}

/** The phone's tab bar, in direction A's style: the same pill and badges, labels shortened. */
function PhoneTabs({ active }: { active: string }) {
  const tabs: readonly [string, LucideIcon, number][] = [...NAV.map(([l, i, c]) => [l === 'Applications' ? 'Apps' : l, i, c] as [string, LucideIcon, number]), ['Settings', Settings, 0]];
  return (
    <nav aria-label="Main" style={{ background: 'linear-gradient(0deg, color-mix(in srgb, var(--rail), var(--on-rail) 8%) 0%, var(--rail) 70%)', boxShadow: 'inset 0 1px 0 var(--rail-rule)' }} className="flex shrink-0 px-1 pt-2 pb-3 text-on-rail">
      {tabs.map(([label, Icon, count]) => {
        const on = label === active;
        return (
          <span key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className={cx('relative grid h-8 w-12 place-items-center rounded-full', on ? 'bg-accent-fill/25 text-accent-fill' : 'text-on-rail')}>
              <Icon className="size-[22px]" strokeWidth={1.75} aria-hidden />
              {count > 0 && (
                <span className="absolute -top-1 -right-1.5">
                  <Badge n={count} size={16} />
                </span>
              )}
            </span>
            <span className={cx('text-time leading-none', on ? 'font-semibold text-on-rail' : 'font-medium text-on-rail-muted')}>{label}</span>
          </span>
        );
      })}
    </nav>
  );
}

// ============ the Tasks board ============

interface T {
  title: string;
  notes?: string;
  cat?: [string, CalendarColor];
  when?: { text: string; icon?: LucideIcon; tone?: 'danger' };
  repeat?: boolean;
  aside?: string;
  subs?: string;
  file?: boolean;
  high?: boolean;
  done?: boolean;
}

function TaskCard({ t }: { t: T }) {
  const facts = [t.repeat && { Icon: Repeat, text: undefined, label: 'Repeats' }, t.aside && { Icon: CalendarClock, text: t.aside, label: 'Time set aside' }, t.subs && { Icon: ListChecks, text: t.subs, label: 'Subtasks done' }, t.file && { Icon: Paperclip, text: undefined, label: 'Has a file' }].filter(Boolean) as { Icon: LucideIcon; text?: string; label: string }[];
  return (
    <article className={cx(card, t.done && 'opacity-60')}>
      {t.high && <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-accent" />}
      <IconBtn icon={MoreHorizontal} label="More" className="absolute top-2.5 right-2.5" />
      <div className="flex items-start gap-3">
        <RoundCheck done={t.done} />
        <div className="min-w-0 flex-1">
          <p className={cx('pr-6 text-body leading-snug font-medium text-ink', t.done && 'line-through')}>{t.title}</p>
          {t.notes && <p className="mt-1 line-clamp-2 text-meta text-ink-muted">{t.notes}</p>}
          {(t.cat || t.when) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {t.cat && <Chip color={t.cat[1]}>{t.cat[0]}</Chip>}
              {t.when && (
                <Chip icon={t.when.icon ?? Clock} tone={t.when.tone}>
                  {t.when.text}
                </Chip>
              )}
            </div>
          )}
          {facts.length > 0 && (
            <div className="mt-2.5 flex items-center gap-3 text-time text-ink-muted">
              {facts.map(({ Icon, text, label }) => (
                <span key={label} className="inline-flex items-center gap-1" title={label}>
                  <Icon className="size-3.5" aria-hidden />
                  {text && <span className="font-mono">{text}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

const OVERDUE: T[] = [
  { title: 'Submit lab report 3', notes: 'Include the error analysis table and cite the two papers from week 4.', cat: ['School', 'dusty-blue'], when: { text: 'Nov 9 · 11:59 PM', icon: CalendarDays, tone: 'danger' } },
  { title: 'Email Dr. Rivera about the recommendation', cat: ['Work', 'teal'], when: { text: 'Nov 10', icon: CalendarDays, tone: 'danger' }, high: true },
  { title: 'Renew library books', cat: ['Personal', 'plum'], when: { text: 'Nov 11', icon: CalendarDays, tone: 'danger' } },
];
const TODAY: T[] = [
  { title: 'Outline the project README', notes: 'Cover setup, the data model and how to run the tests.', cat: ['Skills', 'indigo'], when: { text: '5:00 PM' }, aside: '1h', subs: '2/5', high: true },
  { title: 'Post in the club group chat', cat: ['Clubs', 'sage'], when: { text: 'Until Tue', icon: Repeat } },
  { title: 'Read chapter 6', cat: ['Reading', 'rose'], when: { text: '8:00 PM' }, file: true },
];
const DONE: T[] = [
  { title: 'Pay phone bill', cat: ['Personal', 'plum'], done: true },
  { title: 'Book dentist', cat: ['Health', 'ochre'], done: true },
];
const SOON: T[] = [
  { title: 'Team sync agenda', cat: ['Work', 'teal'], when: { text: 'Fri', icon: CalendarDays } },
  { title: 'Text club members about deliverables', cat: ['Clubs', 'sage'], when: { text: 'Mon 4:30 PM' }, repeat: true },
  { title: 'Apply to Northwind Labs', notes: 'Résumé, short cover note and the portfolio link.', cat: ['Applications', 'tomato'], when: { text: 'Tue', icon: CalendarDays }, aside: '2h' },
  { title: 'Plan the study group', cat: ['School', 'dusty-blue'], when: { text: 'Wed 6:00 PM' }, subs: '0/3' },
];
const LATER: T[] = [
  { title: 'Renew passport', cat: ['Personal', 'plum'], when: { text: 'Nov 24', icon: CalendarDays }, file: true },
  { title: 'Draft the internship essay', notes: 'Two paragraphs on why systems work; keep it under 300 words.', cat: ['Applications', 'tomato'], when: { text: 'Dec 3', icon: CalendarDays }, aside: '2h' },
  { title: 'Look into summer housing', cat: ['Personal', 'plum'] },
];

const D = { overdue: 'var(--danger)', today: 'var(--accent)', soon: 'var(--cal-dusty-blue)', later: 'var(--ink-muted)' };

/** The Tasks page: a toolbar under the title, then four columns by when things are due. */
function TasksBoard() {
  return (
    <div className="flex h-full flex-col px-10 pt-9">
      <header className="mb-5 flex items-end justify-between gap-6">
        <h1 className="font-display text-page">Tasks</h1>
        <QuickBar />
      </header>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Search_ />
        <Tool icon={SlidersHorizontal}>Filters</Tool>
        <Tool>
          Calendars
          <ChevronDown className="size-4" aria-hidden />
        </Tool>
        <Tool icon={ArrowUpDown}>
          Sort: Due time
          <ChevronDown className="size-4" aria-hidden />
        </Tool>
        <Seg items={[['Board', Columns3], ['List', List]]} value="Board" />
        <Switch_>Hide repeating reminders</Switch_>
        <span className="ml-auto flex gap-2">
          <Tool ghost icon={ListChecks}>Select</Tool>
          <Tool ghost icon={History}>Completed</Tool>
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-4 pb-8">
        <Column dot={D.overdue} name="Overdue" count={OVERDUE.length}>
          {OVERDUE.map((t) => (
            <TaskCard key={t.title} t={t} />
          ))}
        </Column>
        <Column dot={D.today} name="Due today" count={TODAY.length} add="Add task">
          {TODAY.map((t) => (
            <TaskCard key={t.title} t={t} />
          ))}
          <div className="flex items-center gap-2 px-1 pt-1 text-meta font-medium text-ink-muted">
            <ChevronRight className="size-4" aria-hidden />
            Done today <span className="font-mono text-time">{DONE.length}</span>
          </div>
        </Column>
        <Column dot={D.soon} name="Coming up" count={SOON.length} add="Add task">
          {SOON.map((t) => (
            <TaskCard key={t.title} t={t} />
          ))}
        </Column>
        <Column dot={D.later} name="Later" count={LATER.length} add="Add task">
          {LATER.map((t) => (
            <TaskCard key={t.title} t={t} />
          ))}
        </Column>
      </div>
    </div>
  );
}

/** Small things the board also does: an empty column, an opened "Done today", the day picker and the Later question. */
function TaskExtras() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-4">
        <Column dot={D.overdue} name="Overdue" count={0}>
          <p className="px-2 py-6 text-center font-display text-title text-ink-muted italic">Nothing overdue. Nice.</p>
        </Column>
        <Column dot={D.today} name="Due today" count={1} add="Add task">
          <TaskCard t={{ title: 'Outline the project README', cat: ['Skills', 'indigo'], when: { text: '5:00 PM' } }} />
          <div className="flex items-center gap-2 px-1 pt-1 text-meta font-medium text-ink">
            <ChevronDown className="size-4" aria-hidden />
            Done today <span className="font-mono text-time">2</span>
          </div>
          {DONE.map((t) => (
            <TaskCard key={t.title} t={t} />
          ))}
        </Column>
      </div>
      <div className="space-y-4">
        <div className="rounded-panel border border-hairline bg-surface p-4 shadow-popover">
          <p className="mb-2 text-label text-ink-muted uppercase">Move “Plan the study group” to</p>
          <div className="grid grid-cols-4 gap-1.5 text-center text-meta">
            {[['Tomorrow', 'Fri 13'], ['Sat', '14'], ['Sun', '15'], ['Mon', '16'], ['Tue', '17'], ['Wed', '18'], ['Thu', '19']].map(([d, n], i) => (
              <span key={d} className={cx('rounded-control border px-1 py-1.5', i === 0 ? 'border-ink bg-ink text-paper' : 'border-rule text-ink')}>
                <span className="block font-medium">{d}</span>
                <span className="font-mono text-time">{n}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-meta text-ink-muted">Dropping a card on Coming up asks for the day. The card’s ⋯ menu has the same choices without dragging.</p>
        </div>
        <div className="rounded-panel border border-hairline bg-surface p-4 shadow-popover">
          <p className="font-display text-title">Clear the date or pick one?</p>
          <p className="mt-1 text-meta text-ink-muted">“Look into summer housing” is moving to Later.</p>
          <div className="mt-3 flex gap-2">
            <Tool>Clear the date</Tool>
            <Tool icon={CalendarDays}>Pick a date</Tool>
          </div>
        </div>
        <div className="rounded-panel border border-hairline bg-surface p-1 text-body shadow-popover">
          {['Move to Today', 'Pick a day…', 'Clear date', 'Edit', 'Delete'].map((x, i) => (
            <div key={x} className={cx('flex h-8 items-center rounded-control px-3', i === 0 && 'bg-accent-soft', x === 'Delete' && 'text-danger')}>
              {x}
            </div>
          ))}
        </div>
        <p className="text-meta text-ink-muted">The card’s ⋯ menu: the non-drag way to move it.</p>
      </div>
    </div>
  );
}

function TasksPhone() {
  const tabs: [string, number, boolean][] = [['Overdue', 3, false], ['Today', 3, true], ['Coming up', 4, false], ['Later', 3, false]];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-4">
        <SpadeMark className="size-6" />
        <span className="font-display text-section italic">Spade</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 pt-5 [mask-image:linear-gradient(to_bottom,var(--ink)_calc(100%-32px),transparent)]">
        <h1 className="font-display text-page">Tasks</h1>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex h-9 min-w-0 flex-1 items-center border-b border-rule text-body text-ink-muted">Add a task…</span>
          <span className="inline-flex h-8 items-center gap-0.5 rounded-control bg-accent-fill pr-1.5 pl-2 text-on-accent-fill">
            <Plus className="size-4" aria-hidden />
            <ChevronDown className="size-3.5" aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Search_ w="min-w-0 flex-1" />
          <Tool icon={SlidersHorizontal}>
            <span className="sr-only">Filters</span>
          </Tool>
          <Seg items={[['', Columns3], ['', List]]} value="" />
        </div>
        <div role="tablist" aria-label="When" className="-mx-4 mt-4 flex gap-5 overflow-hidden border-b border-hairline px-4 text-body">
          {tabs.map(([name, n, on]) => (
            <span key={name} className={cx('-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 whitespace-nowrap', on ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-muted')}>
              {name}
              <span className="rounded-full bg-well px-1.5 font-mono text-time">{n}</span>
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {TODAY.map((t) => (
            <TaskCard key={t.title} t={t} />
          ))}
          <span className="inline-flex items-center gap-1.5 px-1 text-body font-medium text-accent-ink">
            <Plus className="size-4" aria-hidden />
            Add task
          </span>
        </div>
      </div>
      <PhoneTabs active="Tasks" />
    </div>
  );
}

// ============ the Applications board ============

interface A {
  company: string;
  role: string;
  where: string;
  color: CalendarColor;
  pill?: [ReactNode, 'plain' | 'honey' | 'green', LucideIcon?];
  counts?: [number, number, number];
}

const Monogram = ({ name, color }: { name: string; color: CalendarColor }) => (
  <span style={calendarVars(color)} className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-(color:--c-strong) font-display text-body font-semibold text-ink" aria-hidden>
    {name[0]}
  </span>
);

function AppCard({ a }: { a: A }) {
  const [todos, interviews, files] = a.counts ?? [0, 0, 0];
  const foot = [todos > 0 && { Icon: ListChecks, n: todos, label: 'To-dos' }, interviews > 0 && { Icon: Video, n: interviews, label: 'Interviews' }, files > 0 && { Icon: Paperclip, n: files, label: 'Files' }].filter(Boolean) as { Icon: LucideIcon; n: number; label: string }[];
  return (
    <article className={card}>
      <IconBtn icon={MoreHorizontal} label="More" className="absolute top-2.5 right-2.5" />
      {a.pill && (
        <div className="mb-3">
          <Chip tone={a.pill[1]} icon={a.pill[2]}>
            {a.pill[0]}
          </Chip>
        </div>
      )}
      <div className="flex items-center gap-2.5 pr-6">
        <Monogram name={a.company} color={a.color} />
        <div className="min-w-0">
          <p className="truncate text-body leading-tight font-semibold text-ink">{a.company}</p>
          <p className="truncate text-meta text-ink-muted">{a.role}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-meta text-ink-muted">{a.where}</p>
      {foot.length > 0 && (
        <div className="mt-3 flex items-center gap-4 border-t border-hairline pt-3 text-time text-ink-muted">
          {foot.map(({ Icon, n, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5" title={label}>
              <Icon className="size-3.5" aria-hidden />
              <span className="font-mono">{n}</span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

const WISH: A[] = [
  { company: 'Juniper Systems', role: 'Software Engineering Intern', where: 'Remote · Deadline Nov 20', color: 'teal', pill: ['Deadline Nov 20', 'plain', CalendarDays], counts: [1, 0, 0] },
  { company: 'Orchard Games', role: 'Data Intern', where: 'Austin, TX · Deadline Dec 2', color: 'sage' },
];
const APPLIED: A[] = [
  { company: 'Northwind Labs', role: 'Backend Intern', where: 'Boston, MA · Applied 6 days ago', color: 'dusty-blue', counts: [1, 0, 2] },
  { company: 'Bluefin Software', role: 'SWE Intern', where: 'Remote · Applied 16 days ago', color: 'indigo', pill: ['Follow up?', 'honey', Clock], counts: [0, 0, 1] },
  { company: 'Harbor Analytics', role: 'Data Analyst Intern', where: 'New York, NY · Applied 3 days ago', color: 'rose' },
];
const ASSESS: A[] = [{ company: 'Ember Robotics', role: 'Firmware Intern', where: 'Pittsburgh, PA · Applied 12 days ago', color: 'terracotta', counts: [1, 0, 0] }];
const INTERVIEW: A[] = [
  { company: 'Cobalt Health', role: 'Platform Intern', where: 'Remote · Applied 20 days ago', color: 'plum', counts: [2, 1, 1] },
  { company: 'Marlin Systems', role: 'SWE Intern', where: 'Norfolk, VA · Applied 24 days ago', color: 'ochre', counts: [1, 2, 0] },
];
const OFFER: A[] = [{ company: 'Lumen Cloud', role: 'SWE Intern', where: 'Seattle, WA · Applied 31 days ago', color: 'olive', pill: ['Offer', 'green', CircleCheck], counts: [1, 3, 2] }];

const P = { wish: 'var(--ink-muted)', applied: 'var(--cal-dusty-blue)', assess: 'var(--cal-plum)', interview: 'var(--accent)', offer: 'var(--success)', closed: 'var(--cal-slate)' };

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-label text-ink-muted uppercase">{label}</dt>
    <dd className="font-display text-title leading-tight tabular-nums">{value}</dd>
  </div>
);

/** The top of the page, kept slim so the board is the focus. */
function GoalStrip() {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-card border border-hairline bg-card px-5 py-3.5 shadow-card">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-label text-ink-muted uppercase">Offers</p>
          <p className="font-display text-section leading-tight">
            3 <span className="text-title text-ink-muted">of 10</span>
          </p>
        </div>
        <div className="w-44">
          <div role="progressbar" aria-label="Offers" aria-valuenow={3} aria-valuemin={0} aria-valuemax={10} className="h-1.5 overflow-hidden rounded-full bg-rule/50">
            <div className="h-full w-[30%] rounded-full bg-accent-fill" />
          </div>
          <p className="mt-1.5 text-meta text-ink-muted">by Dec 31 · 49 days left</p>
        </div>
      </div>
      <span aria-hidden className="h-8 w-px bg-hairline max-md:hidden" />
      <dl className="flex gap-7">
        <Stat label="Applied" value="18" />
        <Stat label="Heard back" value="44%" />
        <Stat label="Interviews" value="22%" />
      </dl>
      <span className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-accent-fill/25 px-3 text-meta font-medium text-ink">
        <Filter className="size-3.5 text-accent-ink" aria-hidden />1 to follow up
      </span>
    </div>
  );
}

function AppsBoard() {
  return (
    <div className="flex h-full flex-col px-10 pt-9">
      <header className="mb-5 flex items-end justify-between gap-6">
        <h1 className="font-display text-page">Applications</h1>
        <QuickBar />
      </header>
      <GoalStrip />
      <div className="my-5 flex flex-wrap items-center gap-2">
        <Seg items={[['Board', Columns3], ['Table', List]]} value="Board" />
        <Tool icon={SlidersHorizontal}>Filter</Tool>
        <Tool icon={ArrowUpDown}>
          Sort
          <ChevronDown className="size-4" aria-hidden />
        </Tool>
        <span className="ml-auto inline-flex h-8 items-center gap-2 rounded-control bg-accent-fill px-3 text-body font-medium text-on-accent-fill">
          <Plus className="size-4" aria-hidden />
          New application
        </span>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 pb-8">
        <Column className="flex-1" dot={P.wish} name="Wishlist" count={WISH.length} plus>
          {WISH.map((a) => (
            <AppCard key={a.company} a={a} />
          ))}
        </Column>
        <Column className="flex-1" dot={P.applied} name="Applied" count={APPLIED.length} plus>
          {APPLIED.map((a) => (
            <AppCard key={a.company} a={a} />
          ))}
        </Column>
        <Column className="flex-1" dot={P.assess} name="Assessment" count={ASSESS.length} plus>
          {ASSESS.map((a) => (
            <AppCard key={a.company} a={a} />
          ))}
        </Column>
        <Column className="flex-1" dot={P.interview} name="Interviewing" count={INTERVIEW.length} plus>
          {INTERVIEW.map((a) => (
            <AppCard key={a.company} a={a} />
          ))}
        </Column>
        <Column className="flex-1" dot={P.offer} name="Offer" count={OFFER.length} plus>
          {OFFER.map((a) => (
            <AppCard key={a.company} a={a} />
          ))}
        </Column>
        {/* Closed (Rejected and Withdrawn) starts collapsed to a slim strip. */}
        <section aria-label="Closed, collapsed" className="flex w-14 shrink-0 flex-col items-center gap-3 rounded-2xl bg-well py-4">
          <ChevronRight className="size-4 text-ink-muted" aria-hidden />
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: P.closed }} />
          <span className="text-body font-semibold text-ink [writing-mode:vertical-rl]">Closed</span>
          <span className="rounded-full bg-card px-2 font-mono text-time text-ink-muted">4</span>
        </section>
      </div>
    </div>
  );
}

function AppsExtras() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Column dot={P.closed} name="Closed" count={2}>
        <AppCard a={{ company: 'Granite Bank', role: 'Technology Intern', where: 'Charlotte, NC · Applied 40 days ago', color: 'slate', pill: ['Rejected', 'plain'] }} />
        <AppCard a={{ company: 'Meridian Media', role: 'Data Intern', where: 'Remote · Applied 33 days ago', color: 'umber', pill: ['Withdrawn', 'plain'] }} />
      </Column>
      <div className="space-y-4">
        <div className="rounded-panel border border-hairline bg-surface p-1 text-body shadow-popover">
          {['Open', 'Change status', 'Add interview', 'Add to-do', 'Delete'].map((x, i) => (
            <div key={x} className={cx('flex h-8 items-center rounded-control px-3', i === 0 && 'bg-accent-soft', x === 'Delete' && 'text-danger')}>
              {x}
            </div>
          ))}
        </div>
        <div className="rounded-panel border border-hairline bg-surface p-1 text-body shadow-popover">
          {['Sort: Newest first', 'Sort: Oldest first', 'Sort: Deadline', 'Sort: Company A to Z', 'Collapse column'].map((x, i) => (
            <div key={x} className={cx('flex h-8 items-center rounded-control px-3', i === 0 && 'bg-accent-soft')}>
              {x}
            </div>
          ))}
        </div>
        <p className="text-meta text-ink-muted">The card’s ⋯ menu, and the column’s ⋯ menu. Dropping a card on Closed asks Rejected or Withdrawn.</p>
      </div>
    </div>
  );
}

function AppsPhone() {
  const tabs: [string, number, boolean][] = [['Wishlist', 2, false], ['Applied', 3, true], ['Assessment', 1, false], ['Interviewing', 2, false], ['Offer', 1, false], ['Closed', 4, false]];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-4">
        <SpadeMark className="size-6" />
        <span className="font-display text-section italic">Spade</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 pt-5 [mask-image:linear-gradient(to_bottom,var(--ink)_calc(100%-32px),transparent)]">
        <h1 className="font-display text-page">Applications</h1>
        <div className="mt-3 flex items-center gap-3 rounded-card border border-hairline bg-card px-4 py-3 shadow-card">
          <p className="font-display text-section leading-tight">
            3 <span className="text-title text-ink-muted">of 10</span>
          </p>
          <div className="min-w-0 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-rule/50">
              <div className="h-full w-[30%] rounded-full bg-accent-fill" />
            </div>
            <p className="mt-1 text-time text-ink-muted">Offers · by Dec 31</p>
          </div>
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent-fill/25 px-2 text-time font-medium text-ink">1 to follow up</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Seg items={[['', Columns3], ['', List]]} value="" />
          <Tool icon={SlidersHorizontal}>
            <span className="sr-only">Filter</span>
          </Tool>
          <Tool icon={ArrowUpDown}>
            <span className="sr-only">Sort</span>
          </Tool>
          <span className="ml-auto inline-flex h-8 items-center gap-1 rounded-control bg-accent-fill px-3 text-body font-medium text-on-accent-fill">
            <Plus className="size-4" aria-hidden />
            New
          </span>
        </div>
        <div role="tablist" aria-label="Stage" className="-mx-4 mt-4 flex gap-5 overflow-hidden border-b border-hairline px-4 text-body">
          {tabs.map(([name, n, on]) => (
            <span key={name} className={cx('-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 whitespace-nowrap', on ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-muted')}>
              {name}
              <span className="rounded-full bg-well px-1.5 font-mono text-time">{n}</span>
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {APPLIED.map((a) => (
            <AppCard key={a.company} a={a} />
          ))}
        </div>
      </div>
      <PhoneTabs active="Apps" />
    </div>
  );
}

export function Boards() {
  return (
    <Section id="boards" title="Rail, Tasks board and Applications board: proposals" intro="Made-up data. The cards, chips, columns, shadows and radius are the proposed shared parts; the rail has three directions to choose from.">
      <div id="boards-rail">
        <Sub>The side rail: three directions</Sub>
        <Modes>
          <RailDirections />
        </Modes>
        <p className="mt-3 text-meta text-ink-muted">On a phone every direction becomes the same bottom tab bar, shown in the two phone screens below.</p>
      </div>

      <div id="boards-tasks">
        <Sub>Tasks: the board</Sub>
        <Modes>
          <Screen w={1352} h={820} scale={0.65} label="The Tasks board on a desktop">
            <TasksBoard />
          </Screen>
        </Modes>
      </div>
      <div id="boards-tasks-extras">
        <Sub>Tasks: empty column, opened Done today, moving without dragging</Sub>
        <Modes>
          <TaskExtras />
        </Modes>
      </div>
      <div id="boards-tasks-phone">
        <Sub>Tasks on a phone: one column at a time</Sub>
        <Modes row>
          <Screen w={390} h={780} label="Tasks on a phone">
            <TasksPhone />
          </Screen>
        </Modes>
      </div>

      <div id="boards-apps">
        <Sub>Applications: the pipeline</Sub>
        <Modes>
          <Screen w={1352} h={820} scale={0.65} label="The Applications board on a desktop">
            <AppsBoard />
          </Screen>
        </Modes>
      </div>
      <div id="boards-apps-extras">
        <Sub>Applications: the Closed column opened, and the menus</Sub>
        <Modes>
          <AppsExtras />
        </Modes>
      </div>
      <div id="boards-apps-phone">
        <Sub>Applications on a phone: one stage at a time</Sub>
        <Modes row>
          <Screen w={390} h={780} label="Applications on a phone">
            <AppsPhone />
          </Screen>
        </Modes>
      </div>
    </Section>
  );
}
