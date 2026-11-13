import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { calendarVars } from '../../lib/calendarColors';
import { cx } from '../../lib/cx';
import { tasksUrl, UNCATEGORIZED } from '../../lib/taskParams';
import { Button, IconButton } from '../../ui/Button';

/** The list of calendars, in a dropdown on the Calendar and Tasks pages. The square shows or hides a calendar on the calendar (remembered on this device), the name opens that calendar's to-dos, ⋯ edits it, + adds one. */
export function CalendarsMenu() {
  const { calendars, tasks, hiddenCalendarIds, toggleCalendarHidden, openDialog } = useApp();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // Open from the button's right edge unless that would run off the left of the screen.
  const [fromRight, setFromRight] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();
  const active = location.pathname === '/tasks' ? new URLSearchParams(location.search).get('calendar') : null;

  const counts = useMemo(() => {
    const byCalendar = new Map<string, number>();
    let none = 0;
    for (const t of tasks) {
      if (t.status !== 'todo') continue;
      if (t.calendarId) byCalendar.set(t.calendarId, (byCalendar.get(t.calendarId) ?? 0) + 1);
      else none++;
    }
    return { byCalendar, none };
  }, [tasks]);
  const hidden = calendars.filter((c) => hiddenCalendarIds.has(c.id)).length;

  useEffect(() => {
    if (!open) return;
    const onPress = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      wrap.current?.querySelector('button')?.focus();
    };
    document.addEventListener('pointerdown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const link = 'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-control pr-2 pl-1 text-body transition-colors duration-150 ease-out hover:bg-accent-soft';

  return (
    <div ref={wrap} className="relative">
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setFromRight((wrap.current?.getBoundingClientRect().right ?? 999) >= 304);
          setOpen((o) => !o);
        }}
      >
        Calendars
        {hidden > 0 && <span className="font-normal text-ink-muted">· {hidden} hidden</span>}
        <ChevronDown className={cx('size-4 transition-transform duration-150 ease-out', open && 'rotate-180')} aria-hidden />
      </Button>
      {open && (
        <div id={id} role="group" aria-label="Calendars" className={cx('absolute top-full z-40 mt-1 w-72 animate-pop rounded-panel border border-hairline bg-surface p-2 shadow-popover', fromRight ? 'right-0' : 'left-0')}>
          <div className="flex items-center justify-between pr-1 pl-2">
            <h2 className="text-label text-ink-muted uppercase">Calendars</h2>
            <IconButton
              icon={Plus}
              label="New calendar"
              className="size-6"
              onClick={() => {
                setOpen(false);
                openDialog({ kind: 'calendar', id: 'new' });
              }}
            />
          </div>
          <ul className="mt-1 max-h-[60dvh] overflow-y-auto">
            {(counts.none > 0 || active === UNCATEGORIZED) && (
              <li className="flex items-center">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center">
                  <span className="size-2.5 border-[1.5px] border-dashed border-ink-muted" />
                </span>
                <Link to={tasksUrl({ calendarId: UNCATEGORIZED })} onClick={() => setOpen(false)} aria-current={active === UNCATEGORIZED ? 'page' : undefined} className={cx(link, active === UNCATEGORIZED && 'bg-accent-soft font-medium')}>
                  <span className="min-w-0 flex-1 truncate">Uncategorized</span>
                  <span className="font-mono text-meta text-ink-muted tabular-nums">{counts.none}</span>
                </Link>
              </li>
            )}
            {calendars.map((c) => {
              const visible = !hiddenCalendarIds.has(c.id);
              const count = counts.byCalendar.get(c.id) ?? 0;
              return (
                <li key={c.id} style={calendarVars(c.color)} className="group flex items-center">
                  {/* The square is also the switch for showing this calendar on the calendar page: filled = shown, outline = hidden. */}
                  <button
                    type="button"
                    aria-pressed={visible}
                    aria-label={`Show “${c.name}” on the calendar`}
                    title={visible ? 'Shown on the calendar. Click to hide.' : 'Hidden from the calendar. Click to show.'}
                    onClick={() => toggleCalendarHidden(c.id)}
                    className="grid size-8 shrink-0 place-items-center rounded-control transition-colors duration-150 ease-out hover:bg-accent-soft"
                  >
                    <span aria-hidden className={cx('size-2.5 border-[1.5px] border-(color:--c)', visible ? 'bg-(color:--c)' : 'bg-transparent')} />
                  </button>
                  <Link to={tasksUrl({ calendarId: c.id })} onClick={() => setOpen(false)} aria-current={active === c.id ? 'page' : undefined} className={cx(link, active === c.id && 'bg-accent-soft font-medium', !visible && 'text-ink-muted')}>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {count > 0 && <span className="font-mono text-meta text-ink-muted tabular-nums">{count}</span>}
                  </Link>
                  <IconButton
                    icon={MoreHorizontal}
                    label={`Edit calendar “${c.name}”`}
                    className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                    onClick={() => {
                      setOpen(false);
                      openDialog({ kind: 'calendar', id: c.id });
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
