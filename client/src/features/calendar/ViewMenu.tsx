import { CalendarClock, CalendarDays, CalendarRange, ChevronDown, Flame, ListChecks, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Checkbox } from '../../ui/Checkbox';
import { Dropdown } from '../../ui/Dropdown';
import type { MenuItem } from '../../ui/Menu';
import type { Layers } from './CalendarHeader';
import type { CalendarViewId } from './calendarModel';

const row = 'flex h-8 w-full cursor-pointer items-center gap-2 rounded-control px-2 text-left text-body transition-colors duration-150 ease-out hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent';

function Option({ icon: Icon, label, on, onChange }: { icon: LucideIcon; label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={row}>
      <Checkbox checked={on} onChange={(e) => onChange(e.target.checked)} label={label} className="-ml-2" />
      <Icon className="size-4 text-ink-muted" aria-hidden />
      {label}
    </label>
  );
}

const Heading = ({ children }: { children: string }) => <h2 className="px-2 pt-1 pb-1 text-label text-ink-muted uppercase">{children}</h2>;

interface Props {
  view: CalendarViewId;
  layers: Layers;
  onLayers: (layers: Layers) => void;
  /** The workload shading on the month view. */
  heat: boolean;
  onHeat: (on: boolean) => void;
  /** New block, week template, duplicate, copy a day (Week and Day only). */
  routineItems: MenuItem[];
}

/** What shows on the calendar, in one place instead of a row of buttons: events, to-dos, time blocks, the routine, and (on the month) the workload shading. On Week and Day it also holds the routine's own actions. */
export function ViewMenu({ view, layers, onLayers, heat, onHeat, routineItems }: Props) {
  const grid = view === 'week' || view === 'day';
  const off = (['events', 'tasks', 'blocks'] as const).filter((k) => !layers[k]).length + (grid && !layers.routine ? 1 : 0);
  return (
    <Dropdown
      label="What the calendar shows"
      button={(open) => (
        <>
          <SlidersHorizontal className="size-4" aria-hidden />
          View
          {off > 0 && <span className="font-normal text-ink-muted">· {off} off</span>}
          <ChevronDown className={cx('size-4 transition-transform duration-150 ease-out', open && 'rotate-180')} aria-hidden />
        </>
      )}
    >
      {(close) => (
        <>
          <Heading>Show on the calendar</Heading>
          <Option icon={CalendarDays} label="Events" on={layers.events} onChange={(events) => onLayers({ ...layers, events })} />
          <Option icon={ListChecks} label="To-dos" on={layers.tasks} onChange={(tasks) => onLayers({ ...layers, tasks })} />
          <Option icon={CalendarClock} label="Time blocks" on={layers.blocks} onChange={(blocks) => onLayers({ ...layers, blocks })} />
          {grid && <Option icon={CalendarRange} label="Routine" on={layers.routine} onChange={(routine) => onLayers({ ...layers, routine })} />}
          {view === 'month' && <Option icon={Flame} label="Workload shading" on={heat} onChange={onHeat} />}
          {grid && (
            <>
              <hr className="my-2 border-hairline" />
              <Heading>Routine</Heading>
              {routineItems.map(({ label, icon: Icon, disabled, onSelect }) => (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  className={row}
                  onClick={() => {
                    close();
                    onSelect?.();
                  }}
                >
                  {Icon && <Icon className="size-4 text-ink-muted" aria-hidden />}
                  {label}
                </button>
              ))}
            </>
          )}
        </>
      )}
    </Dropdown>
  );
}
