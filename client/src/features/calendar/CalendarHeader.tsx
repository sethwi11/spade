import { CalendarPlus, ChevronLeft, ChevronRight, PanelRight } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Button, IconButton } from '../../ui/Button';
import type { MenuItem } from '../../ui/Menu';
import { Segmented } from '../../ui/Segmented';
import { CALENDAR_VIEWS, type CalendarViewId } from './calendarModel';
import { CalendarsMenu } from './CalendarsMenu';
import { ViewMenu } from './ViewMenu';

export interface Layers {
  events: boolean;
  tasks: boolean;
  /** Time blocks: time set aside to work on a to-do. */
  blocks: boolean;
  /** The weekly routine (Week and Day views only). */
  routine: boolean;
}

interface CalendarHeaderProps {
  title: string;
  view: CalendarViewId;
  layers: Layers;
  onView: (view: CalendarViewId) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLayers: (layers: Layers) => void;
  onAddEvent: () => void;
  /** What View offers for the routine: new block, week template, duplicate, copy a day. */
  routineItems: MenuItem[];
  /** The workload map (month view): shade each day by how heavy it is. */
  heat: boolean;
  onHeat: (on: boolean) => void;
  /** The to-do panel beside the week and day views, which you drag from to set time aside. */
  panel: boolean;
  onPanel: (on: boolean) => void;
}

const UNIT: Record<CalendarViewId, string> = { month: 'month', week: 'week', day: 'day', agenda: 'week' };

/** One calm row: where you are on the left, and on the right the view, what shows, which calendars, and Add event. */
export function CalendarHeader({ title, view, layers, onView, onToday, onPrev, onNext, onLayers, onAddEvent, routineItems, heat, onHeat, panel, onPanel }: CalendarHeaderProps) {
  const grid = view === 'week' || view === 'day';
  return (
    <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex items-center gap-1">
        <Button variant="secondary" onClick={onToday}>
          Today
        </Button>
        <IconButton icon={ChevronLeft} label={`Previous ${UNIT[view]}`} onClick={onPrev} />
        <IconButton icon={ChevronRight} label={`Next ${UNIT[view]}`} onClick={onNext} />
      </div>

      <h1 className="mr-auto min-w-0 font-display text-section">
        <span className="sr-only">Calendar: </span>
        {title}
      </h1>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Calendar view" value={view} onChange={onView} options={CALENDAR_VIEWS.map((v) => ({ value: v.id, label: v.label }))} />
        {grid && (
          <Button variant="secondary" icon={PanelRight} aria-pressed={panel} onClick={() => onPanel(!panel)} className={cx('max-lg:hidden', panel && 'bg-accent-soft')} title={panel ? 'Hide the to-do list' : 'Show your to-dos to drag onto the calendar'}>
            <span className="max-xl:sr-only">To schedule</span>
          </Button>
        )}
        <ViewMenu view={view} layers={layers} onLayers={onLayers} heat={heat} onHeat={onHeat} routineItems={routineItems} />
        <CalendarsMenu />
        <Button variant="primary" icon={CalendarPlus} onClick={onAddEvent}>
          <span className="max-sm:sr-only">Add event</span>
        </Button>
      </div>
    </header>
  );
}
