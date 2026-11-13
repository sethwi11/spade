import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';

/** One titled block of the style guide. */
export function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6 border-t border-rule pt-8">
      <h2 id={`${id}-h`} className="font-display text-section text-ink">
        {title}
      </h2>
      {intro && <p className="mt-1 max-w-[62ch] text-body text-ink-muted">{intro}</p>}
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

/** A small caption above a group of samples. */
export function Caption({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-label text-ink-muted uppercase">{children}</h3>;
}

/** A sample area: shows a component on the page, with a hairline frame. */
export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('border border-hairline p-4 sm:p-5', className)}>{children}</div>;
}

export type Mode = 'light' | 'dark';

/** Reads CSS variables as the browser actually resolves them inside an element that carries `.light` or `.dark`. */
export function useModeTokens(names: readonly string[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    if (!ref.current) return;
    const style = getComputedStyle(ref.current);
    setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()])));
  }, [names]);
  return [ref, values] as const;
}

export const isHex = (v: string | undefined): v is string => !!v && /^#[0-9a-f]{6}$/i.test(v);

const MODES: Mode[] = ['light', 'dark'];

/** The same mockup in both modes: `.light` / `.dark` on a wrapper flips every token inside it. */
export function Modes({ children, row = false }: { children: ReactNode; row?: boolean }) {
  return (
    <div className={cx('gap-6', row ? 'grid sm:grid-cols-2' : 'space-y-6')}>
      {MODES.map((m) => (
        <div key={m} className="min-w-0">
          <Caption>{m === 'light' ? 'Light' : 'Dark'}</Caption>
          <div className={cx(m, 'overflow-x-auto bg-paper text-ink', row && 'p-4')}>{children}</div>
        </div>
      ))}
    </div>
  );
}

/** A screen at its real size, shrunk by `scale`. Inert, so none of it takes focus. */
export function Screen({ w, h, scale = 1, label, children }: { w: number; h: number; scale?: number; label: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className="overflow-hidden rounded-panel border border-hairline" style={{ width: w * scale, height: h * scale }}>
      <div inert className="relative overflow-hidden bg-paper text-ink" style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
