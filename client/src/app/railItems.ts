import { Briefcase, CalendarCheck, CalendarDays, CalendarRange, ClipboardCheck, Compass, GraduationCap, ListTodo, NotebookPen, Wallet, type LucideIcon } from 'lucide-react';

export interface RailItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Out of the menu unless "Show hidden pages" is on. The page, its links and its data all still work. */
  hidden?: boolean;
  /** What the phone's tab bar says where there is less room. */
  short?: string;
}

export const RAIL_ITEMS: RailItem[] = [
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/week', label: 'Week', icon: CalendarRange, hidden: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/applications', label: 'Applications', icon: Briefcase, short: 'Apps' },
  { to: '/courses', label: 'Courses', icon: GraduationCap },
  { to: '/money', label: 'Money', icon: Wallet, hidden: true },
  { to: '/path', label: 'Path', icon: Compass, hidden: true },
  { to: '/review', label: 'Review', icon: ClipboardCheck, hidden: true },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
];

export const railItems = (showHidden: boolean) => RAIL_ITEMS.filter((i) => showHidden || !i.hidden);
