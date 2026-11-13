import { useEffect, useMemo, useRef, useState } from 'react';
import { blockMinutesFor, combine, describeLoad, minutesBetween, selfIds, timePart, type DayLoad, type EventOccurrence, type PlanItem } from '@todo/shared';
import { ListChecks } from 'lucide-react';
import { BlockText, blockPadding, TodoBlock } from '../../ui/blocks';
import { Checkbox } from '../../ui/Checkbox';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { DateSelectArg, EventClickArg, EventContentArg, EventDropArg, EventInput } from '@fullcalendar/core';
import type { DropArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { useApp } from '../../app/AppContext';
import { cx } from '../../lib/cx';
import { formatTime } from '../../lib/dates';
import { anchorOf, Popover, type PopoverAnchor } from '../../ui/Popover';
import '../../styles/calendar.css';
import { describeConflicts, formatTimeRange } from './format';
import { shadeFor, shadeProps } from '../../lib/calendarColors';
import { localDate, localDateTime, selectionToSpan, spanFromFullCalendar, taskSpan, type CalendarItem, type TaskItem } from './calendarModel';
import { HeatTooltip } from './HeatLegend';
import { ItemBlock } from './ItemBlock';
import type { Selection } from './QuickCreate';

type GridView = 'month' | 'week' | 'day';
const FC_VIEW: Record<GridView, string> = { month: 'dayGridMonth', week: 'timeGridWeek', day: 'timeGridDay' };

/** An item as FullCalendar wants it. The item itself rides along in `extendedProps`, so handlers get it back untouched. */
function toFullCalendarEvent(item: CalendarItem): EventInput {
  if (item.kind === 'event') {
    const { occurrence } = item;
    // All-day events are plain dates; FullCalendar treats a date-only end as exclusive, same as the stored value.
    const day = (v: string) => (occurrence.allDay ? v.slice(0, 10) : v);
    return { id: item.id, title: occurrence.event.title, start: day(occurrence.start), end: day(occurrence.end), allDay: occurrence.allDay, extendedProps: { item } };
  }
  if (item.kind === 'block') {
    // A time block is moved and stretched like an event, but always has a start and end on the grid (never all-day).
    return { id: item.id, title: item.task.title, start: item.block.start, end: item.block.end, allDay: false, extendedProps: { item } };
  }
  const span = taskSpan(item.task);
  // A to-do can be moved but not stretched: it has a due time, not a duration.
  return { id: item.id, title: item.task.title, start: span.start, end: span.end, allDay: span.allDay, durationEditable: false, extendedProps: { item } };
}

const itemOf = (arg: { event: { extendedProps: Record<string, unknown> } }) => arg.event.extendedProps.item as CalendarItem;
const NO_ROUTINE: PlanItem[] = [];
const NO_CHIPS = new Map<string, TaskItem[]>();

interface CalendarViewProps {
  view: GridView;
  date: string;
  items: CalendarItem[];
  /** True while the quick-create card is open, so the highlighted range stays on screen until it closes. */
  hasSelection: boolean;
  onSelect: (selection: Selection) => void;
  onOpenItem: (item: CalendarItem, anchor: PopoverAnchor) => void;
  onOpenDay: (date: string) => void;
  /** Month view only: how heavy each day is, to shade it (null = the workload map is off). */
  loads?: Map<string, DayLoad> | null;
  /** Routine blocks to draw behind everything else (a click opens the day's changes, and from there the block itself). */
  routine?: readonly PlanItem[];
  onOpenRoutine?: (item: PlanItem) => void;
  /** To-dos with a time inside a routine block, drawn on top of it, by the block's key. */
  chips?: ReadonlyMap<string, TaskItem[]>;
}

/** Month, Week, and Day, drawn by FullCalendar (which does the hard parts: layout of overlapping events, dragging, resizing, selecting). */
export function CalendarView({ view, date, items, hasSelection, onSelect, onOpenItem, onOpenDay, loads = null, routine = NO_ROUTINE, onOpenRoutine, chips = NO_CHIPS }: CalendarViewProps) {
  const { clashesFor, editEvent, rescheduleTask, toggleTask, tasks, scheduleTask, moveTimeBlock, showToast } = useApp();
  const [tip, setTip] = useState<{ load: DayLoad; x: number; y: number } | null>(null);
  // Two or more to-dos in one routine block fold into a "+N to-dos" chip; this is the list it opens (by the block's key, so it stays current as you tick things off).
  const [group, setGroup] = useState<{ key: string; anchor: PopoverAnchor } | null>(null);
  const grouped = group ? (chips.get(group.key) ?? []) : [];
  const ref = useRef<FullCalendar>(null);
  const container = useRef<HTMLDivElement>(null);

  // Keep FullCalendar on the view and date from the address bar.
  useEffect(() => {
    const api = ref.current?.getApi();
    if (!api) return;
    if (api.view.type !== FC_VIEW[view]) api.changeView(FC_VIEW[view], date);
    else api.gotoDate(date);
  }, [view, date]);

  // The highlighted range clears once the card for it is closed.
  useEffect(() => {
    if (!hasSelection) ref.current?.getApi().unselect();
  }, [hasSelection]);

  const events = useMemo(
    () => [...items.map(toFullCalendarEvent), ...routine.map((r): EventInput => ({ id: r.key, title: r.title, start: r.start, end: r.end, editable: false, extendedProps: { routine: r } }))],
    [items, routine],
  );

  function handleSelect(info: DateSelectArg) {
    const span = spanFromFullCalendar(info.start, info.end, info.allDay);
    const { start, end } = selectionToSpan(span.start, span.end, span.allDay);
    // Point at the highlighted range if it is on screen (after FullCalendar has drawn it), else where the pointer was.
    window.setTimeout(() => {
      const mark = container.current?.querySelector('.fc-highlight, .fc-event-mirror');
      const pointer = info.jsEvent && 'clientX' in info.jsEvent ? { x: info.jsEvent.clientX, y: info.jsEvent.clientY } : { x: window.innerWidth / 2, y: window.innerHeight / 3 };
      onSelect({ start, end, allDay: span.allDay, anchor: mark ? anchorOf(mark) : pointer });
    }, 0);
  }

  function handleClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    const target = info.jsEvent.target as HTMLElement;
    // The checkbox on a to-do does its own thing; clicking it shouldn't also open the details.
    if (target.closest('input[type=checkbox]')) return;
    // The "+N to-dos" chip opens the list of them.
    const folded = target.closest<HTMLElement>('[data-chips]');
    if (folded) return setGroup({ key: folded.dataset.chips!, anchor: anchorOf(folded) });
    // A to-do drawn on a routine block opens its own details, not the block's.
    const chip = target.closest<HTMLElement>('[data-chip]');
    if (chip) {
      const item = [...chips.values()].flat().find((i) => i.id === chip.dataset.chip);
      if (item) onOpenItem(item, anchorOf(chip));
      return;
    }
    const r = info.event.extendedProps.routine as PlanItem | undefined;
    if (r) return onOpenRoutine?.(r);
    onOpenItem(itemOf(info), anchorOf(info.el));
  }

  /** A warning for the toast if the new time overlaps something. */
  const clashNote = (occurrence: EventOccurrence, span: { start: string; end: string; allDay: boolean }) => describeConflicts(clashesFor(span, { events: selfIds(occurrence) }));

  async function handleDrop(info: EventDropArg) {
    const item = itemOf(info);
    const span = spanFromFullCalendar(info.event.start!, info.event.end, info.event.allDay);
    if (item.kind === 'block') {
      const saved = await moveTimeBlock(item.block, { start: span.start, end: span.end });
      if (!saved) info.revert();
      return;
    }
    if (item.kind === 'task') {
      const saved = await rescheduleTask(item.task, { dueDate: span.start.slice(0, 10), dueTime: span.allDay ? null : span.start.slice(11, 16) });
      if (!saved) info.revert();
      return;
    }
    const title = item.occurrence.event.title;
    const saved = await editEvent(item.occurrence, span, { verb: 'Move', message: `Moved “${title}”`, note: clashNote(item.occurrence, span) });
    if (!saved) info.revert(); // cancelled, or the server said no: snap it back
  }

  async function handleResize(info: EventResizeDoneArg) {
    const item = itemOf(info);
    if (item.kind === 'block') {
      const span = spanFromFullCalendar(info.event.start!, info.event.end, false);
      if (!(await moveTimeBlock(item.block, { start: span.start, end: span.end }))) info.revert();
      return;
    }
    if (item.kind !== 'event') return info.revert();
    const span = spanFromFullCalendar(info.event.start!, info.event.end, info.event.allDay);
    const title = item.occurrence.event.title;
    const saved = await editEvent(item.occurrence, span, { verb: 'Resize', message: `Resized “${title}”`, note: clashNote(item.occurrence, span) });
    if (!saved) info.revert();
  }

  /** A to-do dragged in from the panel and dropped on a time: set that time aside for it. */
  function handleExternalDrop(info: DropArg) {
    const task = tasks.find((t) => t.id === info.draggedEl.dataset.taskId);
    if (!task) return;
    if (info.allDay) {
      showToast('Drop it on a time of day to set that time aside for it.');
      return;
    }
    void scheduleTask(task, localDateTime(info.date), blockMinutesFor(task));
  }

  function renderContent(arg: EventContentArg) {
    const r = arg.event.extendedProps.routine as PlanItem | undefined;
    if (r) {
      // The routine is the backdrop: always the soft tint (the hatch for free time), so events and classes stand out in front of it.
      const look = shadeProps(r.color, shadeFor(r) === 'free' ? 'free' : 'soft');
      const time = formatTimeRange(timePart(r.start), timePart(r.end));
      const minutes = minutesBetween(r.start, r.end);
      const todos = chips.get(r.key) ?? [];
      // At the to-do's time, but never over the block's own label (two lines in an hour or more, one in 30 minutes).
      const labelRoom = minutes >= 60 ? '2.25rem' : minutes >= 30 ? '1.25rem' : '0px';
      const chipTop = (i: TaskItem) => `max(${labelRoom}, min(${(minutesBetween(r.start, combine(i.task.dueDate!, i.task.dueTime!)) / minutes) * 100}%, calc(100% - 1.5rem)))`;
      return (
        <div style={look.style} title={[r.title, 'routine', time, ...r.hidden.map((h) => `hides ${h}`)].join(' · ')} className={cx('@container relative h-full overflow-hidden rounded-control text-ink', blockPadding(minutes), look.className)}>
          <BlockText title={r.title} time={time} minutes={minutes} notes={r.hidden.length > 0 && <p className="truncate text-time italic">+{r.hidden.length} hidden: {r.hidden.join(', ')}</p>} />
          {todos.length === 1 && (
            // At the to-do's time, over the block, so it never splits the block's column.
            <div data-chip={todos[0]!.id} className="absolute right-1 left-1" style={{ top: chipTop(todos[0]!) }}>
              <TodoBlock title={todos[0]!.task.title} color={todos[0]!.color} calendarName={todos[0]!.calendarName} done={todos[0]!.task.status === 'done'} onToggle={() => void toggleTask(todos[0]!.task)} className="h-6 bg-paper" />
            </div>
          )}
          {todos.length > 1 && (
            <div className="absolute right-1 left-1" style={{ top: chipTop(todos[0]!) }}>
              <button
                type="button"
                data-chips={r.key}
                title={todos.map((i) => i.task.title).join(' · ')}
                className="flex h-6 w-full items-center justify-center gap-1 overflow-hidden rounded-control border border-dashed border-ink bg-paper px-1 text-meta font-medium text-ink transition-colors duration-150 ease-out hover:bg-accent-soft"
              >
                <ListChecks className="size-3.5 shrink-0 @max-[5rem]:hidden" aria-hidden />
                <span className="truncate">
                  +{todos.length}
                  <span className="@max-[5rem]:hidden"> to-dos</span>
                </span>
              </button>
            </div>
          )}
        </div>
      );
    }
    const item = arg.event.extendedProps.item as CalendarItem | undefined;
    // While you drag out a range, FullCalendar draws a temporary "ghost" event that isn't one of ours.
    if (!item) return <div className="h-full rounded-control border border-dashed border-accent bg-accent-soft" />;
    const compact = arg.view.type === 'dayGridMonth' || arg.event.allDay;
    return <ItemBlock item={item} compact={compact} month={arg.view.type === 'dayGridMonth'} onToggleTask={(task) => void toggleTask(task)} />;
  }

  return (
    <div
      ref={container}
      className={cx('planner-cal h-full min-h-0')}
      onMouseMove={(e) => {
        if (!loads || view !== 'month') return;
        const target = e.target as HTMLElement;
        const cell = target.closest<HTMLElement>('.fc-daygrid-day[data-date]');
        const load = cell && !target.closest('.fc-event, .fc-popover') ? loads.get(cell.dataset.date!) : undefined;
        setTip(load ? { load, x: e.clientX, y: e.clientY } : null);
      }}
      onMouseLeave={() => setTip(null)}
    >
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={FC_VIEW[view]}
        initialDate={date}
        headerToolbar={false}
        height="100%"
        firstDay={0}
        events={events}
        eventContent={renderContent}
        eventDisplay="block"
        // A month cell holds what fits; the all-day row of a week stops at two lines (four on a day), with "+N more" opening the day.
        views={{ dayGridMonth: { dayMaxEvents: true }, timeGridWeek: { dayMaxEvents: 2 }, timeGridDay: { dayMaxEvents: 4 } }}
        moreLinkClick={(arg) => onOpenDay(localDate(arg.date))}
        moreLinkContent={(arg) => (
          <>
            +{arg.num}
            <span className="max-sm:hidden"> more</span>
          </>
        )}
        navLinks
        navLinkDayClick={(d) => onOpenDay(localDate(d))}
        nowIndicator
        scrollTime="07:00:00"
        slotDuration="00:30:00"
        snapDuration="00:15:00"
        eventMinHeight={0}
        // Overlapping things sit side by side, never one on top of the other.
        slotEventOverlap={false}
        allDayText="All day"
        slotLabelFormat={{ hour: 'numeric', minute: '2-digit', omitZeroMinute: true, meridiem: 'short', hour12: true }}
        selectable
        selectMirror
        unselectAuto={false}
        selectLongPressDelay={350}
        editable
        droppable={view !== 'month'}
        dropAccept="[data-schedule-task]"
        drop={handleExternalDrop}
        // A time block belongs to a time of day, so it can't be dropped into the all-day row.
        eventAllow={(dropInfo, dragged) => !(dragged?.extendedProps.item?.kind === 'block' && dropInfo.allDay)}
        eventLongPressDelay={350}
        eventResizableFromStart
        select={handleSelect}
        eventClick={handleClick}
        eventDrop={(info) => void handleDrop(info)}
        eventResize={(info) => void handleResize(info)}
        dayHeaderContent={(arg) => {
          // For headers FullCalendar hands over midnight UTC of the day (the month view even uses a reference week in 1970), so read it as UTC: reading it in local time would show the day before in the Americas.
          const weekday = arg.date.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
          if (arg.view.type === 'dayGridMonth') return <span className="block px-2 py-2 text-label text-ink-muted uppercase">{weekday}</span>;
          return (
            <span className="flex items-center gap-2 px-2 py-2">
              <span className="text-label text-ink-muted uppercase">{weekday}</span>
              <span className={cx('grid size-8 place-items-center rounded-full font-display text-section', arg.isToday && 'bg-accent-fill text-on-accent-fill')}>{arg.date.getUTCDate()}</span>
            </span>
          );
        }}
        // The workload map: each day gets a shade (heat-1 to heat-4) from its load, and its description for screen readers.
        dayCellClassNames={(arg) => {
          const load = loads?.get(localDate(arg.date));
          return load && load.level > 0 ? [`heat-${load.level}`] : [];
        }}
        dayCellContent={(arg) => {
          const load = loads?.get(localDate(arg.date));
          return (
            <>
              <span className={cx('grid size-6 place-items-center rounded-full font-mono text-meta', arg.isToday ? 'bg-accent-fill text-on-accent-fill' : 'text-ink')}>{arg.date.getDate()}</span>
              {load && <span className="sr-only">{describeLoad(load)}</span>}
            </>
          );
        }}
      />
      {tip && <HeatTooltip load={tip.load} x={tip.x} y={tip.y} />}
      {group && grouped.length > 0 && (
        <Popover anchor={group.anchor} label="To-dos in this block" onClose={() => setGroup(null)}>
          <div className="p-3">
            <h3 className="mb-1 text-label text-ink-muted uppercase">To-dos in this block</h3>
            <ul>
              {grouped.map((i) => {
                const done = i.task.status === 'done';
                return (
                  <li key={i.id} className="flex items-center gap-1">
                    <Checkbox checked={done} onChange={() => void toggleTask(i.task)} label={`Mark "${i.task.title}" as ${done ? 'not done' : 'done'}`} />
                    <button
                      type="button"
                      onClick={(e) => {
                        const anchor = anchorOf(e.currentTarget);
                        setGroup(null);
                        onOpenItem(i, anchor);
                      }}
                      className="min-w-0 flex-1 py-1.5 text-left text-body hover:underline hover:underline-offset-4"
                    >
                      <span className={cx(done && 'text-ink-muted line-through')}>{i.task.title}</span> <span className="font-mono text-time text-ink-muted">{formatTime(i.task.dueTime!)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Popover>
      )}
    </div>
  );
}
