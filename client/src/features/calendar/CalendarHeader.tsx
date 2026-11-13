import { CalendarClock, CalendarDays, CalendarPlus, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Flame, ListChecks, PanelRight } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Button, IconButton } from '../../ui/Button';
import { Menu, type MenuItem } from '../../ui/Menu';
import { Segmented } from '../../ui/Segmented';
import { CalendarsMenu } from './CalendarsMenu';
import { CALENDAR_VIEWS, type CalendarViewId } from './calendarModel';

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
  /** What the chevron beside Routine offers: new block, week template, duplicate, copy a day. */
  routineItems: MenuItem[];
  /** The workload map (month view): shade each day by how heavy it is. */
  heat: boolean;
  onHeat: (on: boolean) => void;
  /** The to-do panel beside the week and day views, which you drag from to set time aside. */
  panel: boolean;
  onPanel: (on: boolean) => void;
}

const UNIT: Record<CalendarViewId, string> = { month: 'month', week: 'week', day: 'day', agenda: 'week' };

/** The calendar's controls: the title, previous / next / today, the view switcher, and which layers show. */
export function CalendarHeader({ title, view, layers, onView, onToday, onPrev, onNext, onLayers, onAddEvent, routineItems, heat, onHeat, panel, onPanel }: CalendarHeaderProps) {
  return (
    <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h1 className="mr-auto min-w-0 font-display text-section">
        <span className="sr-only">Calendar: </span>
        {title}
      </h1>

      <div className="flex items-center gap-1">
        <Button variant="secondary" onClick={onToday}>
          Today
        </Button>
        <IconButton icon={ChevronLeft} label={`Previous ${UNIT[view]}`} onClick={onPrev} />
        <IconButton icon={ChevronRight} label={`Next ${UNIT[view]}`} onClick={onNext} />
      </div>

      <Segmented label="Calendar view" value={view} onChange={onView} options={CALENDAR_VIEWS.map((v) => ({ value: v.id, label: v.label }))} />

      <div role="group" aria-label="Show on the calendar" className="flex items-center gap-1">
        <LayerToggle icon={CalendarDays} label="Events" on={layers.events} onChange={(events) => onLayers({ ...layers, events })} />
        <LayerToggle icon={ListChecks} label="To-dos" on={layers.tasks} onChange={(tasks) => onLayers({ ...layers, tasks })} />
        <LayerToggle icon={CalendarClock} label="Time blocks" on={layers.blocks} onChange={(blocks) => onLayers({ ...layers, blocks })} />
        {(view === 'week' || view === 'day') && (
          <span className="inline-flex">
            <LayerToggle icon={CalendarRange} label="Routine" on={layers.routine} onChange={(routine) => onLayers({ ...layers, routine })} className="rounded-r-none" />
            <Menu
              align="end"
              items={routineItems}
              trigger={(props) => (
                <button type="button" {...props} aria-label="Routine options" title="New routine block, week template, copy a day" className={cx(layerClass(layers.routine), 'h-8 rounded-l-none border-l-0 px-1.5')}>
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              )}
            />
          </span>
        )}
      </div>

      {view === 'month' && <LayerToggle icon={Flame} label="Workload" on={heat} onChange={onHeat} title={heat ? 'Hide the workload shading' : 'Shade each day by how heavy it is'} />}
      {(view === 'week' || view === 'day') && (
        <span className="max-lg:hidden">
          <LayerToggle icon={PanelRight} label="To schedule" on={panel} onChange={onPanel} title={panel ? 'Hide the to-do list' : 'Show your to-dos to drag onto the calendar'} />
        </span>
      )}

      <CalendarsMenu />

      <Button variant="primary" icon={CalendarPlus} onClick={onAddEvent}>
        <span className="max-sm:sr-only">Add event</span>
      </Button>
    </header>
  );
}

const layerClass = (on: boolean) =>
  cx(
    'inline-flex items-center justify-center rounded-control border text-body transition-colors duration-150 ease-out',
    on ? 'border-ink text-ink hover:bg-accent-soft' : 'border-rule text-ink-muted hover:border-ink-muted hover:text-ink',
  );

function LayerToggle({ icon: Icon, label, on, onChange, title, className }: { icon: typeof CalendarDays; label: string; on: boolean; onChange: (on: boolean) => void; title?: string; className?: string }) {
  return (
    <button type="button" aria-pressed={on} title={title ?? `${on ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => onChange(!on)} className={cx(layerClass(on), 'h-8 gap-1.5 px-2.5 max-sm:w-8 max-sm:px-0', className)}>
      <Icon className="size-4" aria-hidden />
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}
