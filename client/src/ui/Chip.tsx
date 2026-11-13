import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { CalendarColor } from '@todo/shared';
import { calendarVars } from '../lib/calendarColors';
import { cx } from '../lib/cx';

const TONE = {
  plain: 'bg-well',
  danger: 'bg-danger/12',
  honey: 'bg-accent-fill/25',
  green: 'bg-success/15',
} as const;
const ICON = { plain: 'text-ink-muted', danger: 'text-danger', honey: 'text-accent-ink', green: 'text-success' } as const;

/** A small pill: a category (its color's dot), a day or time (an icon), or a status. Meaning is always in the words or the icon, never the color alone. */
export function Chip({ children, icon: Icon, color, tone = 'plain', after, className }: { children: ReactNode; icon?: LucideIcon; color?: CalendarColor; tone?: keyof typeof TONE; after?: ReactNode; className?: string }) {
  return (
    <span style={color ? calendarVars(color) : undefined} className={cx('inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2 text-meta whitespace-nowrap text-ink', TONE[tone], className)}>
      {color && <span aria-hidden className="size-2 shrink-0 rounded-full bg-(color:--c)" />}
      {Icon && <Icon className={cx('size-3.5 shrink-0', ICON[tone])} aria-hidden />}
      <span className="truncate">{children}</span>
      {after}
    </span>
  );
}
