import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { CalendarPlus, ListPlus, Menu } from 'lucide-react';
import { datePart, minutesBetween, timePart, type PlanItem } from '@todo/shared';
import { useApp } from '../app/AppContext';
import { Agenda, categoryOf, Legend } from '../features/today/Agenda';
import { DayChangeDialog } from '../features/today/DayChangeDialog';
import { TaskLines } from '../features/today/NowCard';
import { BIG_BUTTON, FocusPanel } from '../features/focus/FocusPanel';
import { agendaRange, homeDefaults, minutesInto } from '../features/today/todayModel';
import { useNowText, useTodayPlan } from '../features/today/useTodayPlan';
import { useShortcuts } from '../hooks/useShortcuts';
import { calendarVars } from '../lib/calendarColors';
import { formatCountdown, formatDueDate, formatTime, fullDate } from '../lib/dates';
import { tasksUrl } from '../lib/taskParams';
import { Button } from '../ui/Button';

/** Spade's home screen, made for a full screen across the room: the clock, a big Now card with its countdown, the block's to-dos and today's agenda, with Add task and Add event close at hand. */
export default function DisplayPage() {
  const { calendarsById, today, openDialog, undoLast } = useApp();
  const navigate = useNavigate();
  const now = useNowText();
  const { routine, date, plan, current, next, during, supposed } = useTodayPlan(now);
  const [dayChange, setDayChange] = useState<PlanItem | null>(null);
  const agenda = useRef<HTMLDivElement>(null);

  // Start the agenda a little before now; only when the day changes, so it never fights your scrolling.
  const nowAt = minutesInto(plan.date, now) - agendaRange(plan).from;
  const startAt = useRef(nowAt);
  startAt.current = nowAt;
  useEffect(() => {
    if (agenda.current) agenda.current.scrollTop = Math.max(0, startAt.current - 90);
  }, [plan.date]);

  const free = !current || current.kind === 'open' || current.priority === 'free';
  const vars = (current && !free && current.color ? calendarVars(current.color) : { '--c': 'var(--rule)' }) as CSSProperties;
  const left = current ? minutesBetween(now, current.end) : 0;
  const done = current ? 1 - left / Math.max(1, minutesBetween(current.start, current.end)) : 0;

  const defaults = homeDefaults(current, now, today);
  const addTask = () => openDialog({ kind: 'task', mode: 'new', defaults: defaults.task });
  const addEvent = () => openDialog({ kind: 'event', mode: 'new', defaults: defaults.event });
  // N and E, so adding things through the day needs no mouse.
  useShortcuts({ newTask: addTask, newEvent: addEvent, undo: () => void undoLast(), showHelp: () => openDialog({ kind: 'shortcuts' }) });
  const actions = (
    <>
      <Button variant="primary" icon={ListPlus} className={BIG_BUTTON} onClick={addTask}>
        Add task
      </Button>
      <Button variant="primary" icon={CalendarPlus} className={BIG_BUTTON} onClick={addEvent}>
        Add event
      </Button>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper px-6 py-6 text-ink md:px-10 md:py-8 lg:h-dvh lg:overflow-hidden">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sr-only">Home</h1>
          <p className="font-mono text-[clamp(3rem,7vw,6.5rem)] leading-none tabular-nums">{formatTime(timePart(now))}</p>
          <p className="mt-2 font-display text-section text-ink-muted">{fullDate(date)}</p>
        </div>
        <Button variant="secondary" icon={Menu} onClick={() => navigate('/today')}>
          Menu
        </Button>
      </header>

      <div className="mt-8 grid gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8 lg:min-h-0 lg:overflow-y-auto">
          <section aria-label="Now" style={vars} className="rounded-panel border border-rule border-l-8 border-l-(color:--c) bg-surface px-6 py-6 sm:px-8 sm:py-7">
            {routine.loading ? (
              <p className="font-display text-[clamp(2rem,4vw,3.5rem)] text-ink-muted italic">Loading…</p>
            ) : current ? (
              <>
                <h2 className="text-label text-ink-muted uppercase">{current.kind === 'open' ? 'Now' : `Now · ${categoryOf(current, calendarsById)}`}</h2>
                <p className="mt-2 font-display text-[clamp(2.25rem,4.5vw,4rem)] leading-tight break-words">{current.kind === 'open' ? 'Open time' : current.title}</p>
                <p className="mt-3 font-mono text-[clamp(1.5rem,2.6vw,2.25rem)] tabular-nums">
                  {formatCountdown(left * 60_000)} left{' '}
                  <span className="whitespace-nowrap text-ink-muted max-sm:block">
                    <span className="max-sm:hidden">· </span>until {formatTime(timePart(current.end))}
                  </span>
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-hairline" role="progressbar" aria-label="How much of it has passed" aria-valuenow={Math.round(done * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-(color:--c)" style={{ width: `${done * 100}%` }} />
                </div>
              </>
            ) : (
              <p className="font-display text-[clamp(2rem,4vw,3.5rem)] text-ink-muted">Nothing on right now</p>
            )}
            {next && (
              <p className="mt-5 text-title text-ink-muted">
                Next · <span className="text-ink">{next.title}</span> {datePart(next.start) === datePart(now) ? `at ${formatTime(timePart(next.start))}` : `${formatDueDate(datePart(next.start), today)}, ${formatTime(timePart(next.start))}`}
              </p>
            )}
          </section>

          {/* Start focus (on a focus block) shares a row with Add task and Add event; those two are always here. */}
          {current?.kind === 'routine' ? <FocusPanel item={current} big actions={actions} /> : <div className="flex flex-wrap gap-2">{actions}</div>}

          <div className="grid gap-8 md:grid-cols-2">
            {current?.kind === 'routine' && <TaskLines big title="During this block" tasks={during} moreHref={current.calendarId ? tasksUrl({ calendarId: current.calendarId }) : undefined} />}
            {supposed.length > 0 && <TaskLines big title="Supposed to be doing now" tasks={supposed} />}
          </div>
        </div>

        <section aria-label="Agenda" className="flex flex-col lg:min-h-0">
          <Legend items={plan.items} />
          <div ref={agenda} className="mt-4 h-[26rem] overflow-y-auto pr-2 lg:h-auto lg:min-h-0 lg:flex-1">
            <Agenda plan={plan} now={now} onOpen={(item) => item.kind === 'routine' && setDayChange(item)} />
          </div>
        </section>
      </div>

      <DayChangeDialog item={dayChange} date={date} onClose={() => setDayChange(null)} />
    </div>
  );
}
