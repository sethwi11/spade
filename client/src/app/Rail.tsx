import { useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
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

/** Where you are among the menu's items (the page or one of its sub-pages), or null on the home screen. */
function useActiveIndex(items: RailItem[]): number | null {
  const { pathname } = useLocation();
  const i = items.findIndex((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  return i < 0 ? null : i;
}

/** A small round count in honey. */
function Badge({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return <span className={cx('grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent-fill px-1 font-mono text-time leading-none font-medium text-on-accent-fill', className)}>{n}</span>;
}

const focus = 'outline-accent-fill focus-visible:outline-2 focus-visible:outline-offset-2';
/** The icon on its pill: honey-tinted where you are, a soft wash under the pointer. The badge sits on the pill's corner, clear of the icon. */
function Pill({ icon: Icon, count, on }: { icon: RailItem['icon']; count: number; on: boolean }) {
  return (
    <span className={cx('relative grid h-8 w-12 place-items-center rounded-full transition-colors duration-150 ease-out group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent-fill', on ? 'bg-accent-fill/25 text-accent-fill' : 'text-on-rail group-hover:bg-rail-hover')}>
      <Icon className="size-5.5" strokeWidth={1.75} aria-hidden />
      <Badge n={count} className="absolute -top-1.5 -right-2.5" />
    </span>
  );
}

/** The menu down the left of every page: the Spade mark (home), the pages grouped near the top, Settings at the bottom. A button turns it into a labeled sidebar. A phone gets the same items as a tab bar along the bottom. */
export function Rail() {
  const { openDialog } = useApp();
  const { settings, update } = useSettings();
  const counts = useCounts();
  const items = railItems(settings.showHiddenPages);
  const active = useActiveIndex(items);
  const open = settings.railOpen;

  const toggle = (
    <button type="button" aria-expanded={open} aria-label={open ? 'Collapse the menu' : 'Expand the menu'} title={open ? 'Collapse the menu' : 'Expand the menu'} onClick={() => update({ railOpen: !open })} className={cx('grid size-8 shrink-0 place-items-center rounded-control text-on-rail-muted hover:bg-rail-hover hover:text-on-rail', focus)}>
      {open ? <PanelLeftClose className="size-4.5" aria-hidden /> : <PanelLeftOpen className="size-4.5" aria-hidden />}
    </button>
  );
  const home = (
    <Link to="/" aria-label="Spade home" className={cx('flex shrink-0 items-center gap-2.5 rounded-control text-accent-fill', focus)}>
      <SpadeMark className="size-9" />
      {open && <span className="font-display text-section text-on-rail italic">Spade</span>}
    </Link>
  );

  // Every row of a mode is the same height, so one bar can slide to whichever page you are on.
  const bar = (
    <span aria-hidden style={{ transform: `translateY(${(active ?? 0) * (open ? 44 : 64)}px)` }} className={cx('absolute left-0 w-1 rounded-r-full bg-accent-fill transition-transform duration-200 ease-out motion-reduce:transition-none', open ? 'top-2 h-7' : 'top-4 h-8', active === null && 'opacity-0')} />
  );

  return (
    <nav aria-label="Main" className={cx('sticky top-0 hidden h-dvh shrink-0 flex-col bg-linear-to-b from-rail-lift to-rail to-60% py-5 text-on-rail shadow-[inset_-1px_0_0_var(--rail-rule)] mac-app:pt-12 md:flex', open ? 'w-58' : 'w-22 items-center')}>
      {open ? (
        <div className="flex items-center justify-between px-5">
          {home}
          {toggle}
        </div>
      ) : (
        <>
          {home}
          <div className="mt-2">{toggle}</div>
        </>
      )}

      {open && <h2 className="mt-6 mb-1 px-6 text-label text-on-rail-muted uppercase">Main</h2>}
      <ul className={cx('relative min-h-0 w-full flex-1 overflow-y-auto', !open && 'mt-4')}>
        {bar}
        {items.map((item) => (
          <li key={item.to}>
            {open ? (
              <NavLink to={item.to} className={({ isActive }) => cx('group mx-3 flex h-11 items-center gap-3 rounded-xl px-3 text-body transition-colors duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fill', isActive ? 'bg-accent-fill/25 font-semibold text-on-rail' : 'font-medium text-on-rail-muted hover:bg-rail-hover hover:text-on-rail')}>
                {({ isActive }) => (
                  <>
                    <item.icon className={cx('size-5.5 shrink-0', isActive ? 'text-accent-fill' : 'text-on-rail')} strokeWidth={1.75} aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    <Badge n={counts[item.to] ?? 0} />
                  </>
                )}
              </NavLink>
            ) : (
              <NavLink to={item.to} aria-label={counts[item.to] ? `${item.label}, ${counts[item.to]}` : item.label} className="group flex h-16 flex-col items-center justify-center gap-1 outline-none">
                {({ isActive }) => (
                  <>
                    <Pill icon={item.icon} count={counts[item.to] ?? 0} on={isActive} />
                    <span className={cx('text-[12px] leading-none', isActive ? 'font-semibold text-on-rail' : 'font-medium text-on-rail-muted')}>{item.label}</span>
                  </>
                )}
              </NavLink>
            )}
          </li>
        ))}
      </ul>

      <div className={cx('shrink-0 border-t border-rail-rule pt-2', open ? 'mx-0' : 'w-full')}>
        {open && <h2 className="mt-1 mb-1 px-6 text-label text-on-rail-muted uppercase">Settings</h2>}
        {open ? (
          <button type="button" onClick={() => openDialog({ kind: 'settings' })} className="group mx-3 flex h-11 w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 text-body font-medium text-on-rail-muted transition-colors duration-150 ease-out outline-none hover:bg-rail-hover hover:text-on-rail focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fill">
            <Settings className="size-5.5 shrink-0 text-on-rail" strokeWidth={1.75} aria-hidden />
            Settings
          </button>
        ) : (
          <button type="button" onClick={() => openDialog({ kind: 'settings' })} className="group flex h-16 w-full flex-col items-center justify-center gap-1 outline-none">
            <Pill icon={Settings} count={0} on={false} />
            <span className="text-[12px] leading-none font-medium text-on-rail-muted">Settings</span>
          </button>
        )}
      </div>
    </nav>
  );
}

export function TabBar() {
  const { openDialog } = useApp();
  const counts = useCounts();
  const items = railItems(useSettings().settings.showHiddenPages);
  const tab = 'group flex min-w-[3.25rem] flex-1 flex-col items-center gap-1 text-time leading-none outline-none';
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto bg-linear-to-t from-rail-lift to-rail to-70% px-1 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-on-rail shadow-[inset_0_1px_0_var(--rail-rule)] md:hidden">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} aria-label={counts[item.to] ? `${item.label}, ${counts[item.to]}` : item.label} className={tab}>
          {({ isActive }) => (
            <>
              <Pill icon={item.icon} count={counts[item.to] ?? 0} on={isActive} />
              <span aria-hidden className={isActive ? 'font-semibold text-on-rail' : 'font-medium text-on-rail-muted'}>
                {item.short ?? item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
      <button type="button" onClick={() => openDialog({ kind: 'settings' })} className={tab}>
        <Pill icon={Settings} count={0} on={false} />
        <span className="font-medium text-on-rail-muted">Settings</span>
      </button>
    </nav>
  );
}
