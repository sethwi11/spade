import { useMemo } from 'react';
import { Link, NavLink } from 'react-router';
import { Settings } from 'lucide-react';
import { followUpSuggestions, isOverdue } from '@todo/shared';
import { useSettings } from '../hooks/useSettings';
import { cx } from '../lib/cx';
import { SpadeMark } from '../ui/SpadeMark';
import { useApp } from './AppContext';
import { railItems, type RailItem } from './railItems';

/** The counts that matter: Today's open items (due today or overdue) and applications waiting on a follow-up. */
function useCounts(): Record<string, number> {
  const { tasks, applications, today } = useApp();
  return useMemo(
    () => ({
      '/today': tasks.filter((t) => t.status === 'todo' && (t.dueDate === today || isOverdue(t, today))).length,
      '/applications': followUpSuggestions(applications, today).length,
    }),
    [tasks, applications, today],
  );
}

/** The count on an icon: honey on the rail, cerulean on the honey tile of the page you're on. */
function Badge({ n, active }: { n: number; active: boolean }) {
  if (n <= 0) return null;
  return <span className={cx('absolute -top-1.5 -right-3 grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 font-mono text-time leading-none font-medium', active ? 'bg-rail text-accent-fill' : 'bg-accent-fill text-on-accent-fill')}>{n}</span>;
}

const focus = 'outline-accent-fill focus-visible:outline-2 focus-visible:outline-offset-2';
/** The icons grow with the window's height, so a tall bar is filled by bigger icons as well as more room between them. */
const icon = 'size-[clamp(1.375rem,3.2dvh,2rem)]';
const idle = 'text-on-rail-muted hover:bg-rail-hover hover:text-on-rail';
const active = 'bg-accent-fill text-on-accent-fill';

/** The menu down the left of every page: the Spade mark (home) and the pages, filling the bar from top to bottom with Settings last. A phone gets the same items as a tab bar along the bottom. */
export function Rail() {
  const { openDialog } = useApp();
  const counts = useCounts();
  const items = railItems(useSettings().settings.showHiddenPages);
  // Every item gets an equal share of the bar's height, so it is full whatever the window's height. The highlighted tile stops growing at 96px, so a tall window gets more room around the icons, not a slab.
  const slot = 'group flex h-full w-full items-center justify-center outline-none';
  const tile = (state: string) => cx('flex h-full max-h-24 w-full flex-col items-center justify-center gap-[clamp(0.25rem,0.9dvh,0.5rem)] rounded-control px-1 text-time leading-none font-medium group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent-fill', state);
  const railIdle = 'text-on-rail-muted group-hover:bg-rail-hover group-hover:text-on-rail';
  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-22 shrink-0 flex-col items-center bg-rail pt-4 pb-3 text-on-rail md:flex">
      <Link to="/" aria-label="Spade home" className={cx('mb-3 grid size-11 shrink-0 place-items-center rounded-control text-accent-fill hover:bg-rail-hover', focus)}>
        <SpadeMark className="size-8" />
      </Link>
      <ul className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-2">
        {items.map((item) => (
          <li key={item.to} className="flex min-h-14 flex-1">
            <NavLink to={item.to} className={slot}>
              {({ isActive }) => (
                <span className={tile(isActive ? active : railIdle)}>
                  <RailLabel item={item} count={counts[item.to] ?? 0} active={isActive} />
                </span>
              )}
            </NavLink>
          </li>
        ))}
        <li className="mt-1 flex min-h-14 flex-1 border-t border-rail-rule pt-1">
          <button type="button" onClick={() => openDialog({ kind: 'settings' })} className={slot}>
            <span className={tile(railIdle)}>
              <Settings className={icon} aria-hidden />
              Settings
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

function RailLabel({ item, count, active }: { item: RailItem; count: number; active: boolean }) {
  return (
    <>
      <span className="relative">
        <item.icon className={icon} aria-hidden />
        <Badge n={count} active={active} />
      </span>
      {item.label}
    </>
  );
}

export function TabBar() {
  const { openDialog } = useApp();
  const counts = useCounts();
  const items = railItems(useSettings().settings.showHiddenPages);
  const tab = 'flex min-w-[3.25rem] flex-1 flex-col items-center gap-1 text-time leading-none font-medium';
  // The icon sits on a pill: honey for the page you're on.
  const pill = (on: boolean) => cx('grid h-7 w-12 place-items-center rounded-control', on ? active : idle);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto bg-rail px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-on-rail md:hidden">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} aria-label={counts[item.to] ? `${item.label}, ${counts[item.to]}` : item.label} className={({ isActive }) => cx(tab, focus, isActive ? 'text-on-rail' : 'text-on-rail-muted')}>
          {({ isActive }) => (
            <>
              <span className={pill(isActive)}>
                <span className="relative">
                  <item.icon className="size-5" aria-hidden />
                  <Badge n={counts[item.to] ?? 0} active={isActive} />
                </span>
              </span>
              <span aria-hidden>{item.short ?? item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button type="button" onClick={() => openDialog({ kind: 'settings' })} className={cx(tab, focus, 'text-on-rail-muted')}>
        <span className={pill(false)}>
          <Settings className="size-5" aria-hidden />
        </span>
        Settings
      </button>
    </nav>
  );
}
