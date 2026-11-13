import type { ComponentProps } from 'react';
import { cx } from '../lib/cx';

/** A board card: a white surface (an elevated one at night), a soft border, and a very light shadow that lifts when it is pointed at or something inside has focus. */
export function Card({ className, ...rest }: ComponentProps<'article'>) {
  return <article className={cx('group relative rounded-card border border-hairline bg-card p-4 shadow-card transition-shadow duration-150 ease-out focus-within:shadow-card-hover hover:shadow-card-hover', className)} {...rest} />;
}
