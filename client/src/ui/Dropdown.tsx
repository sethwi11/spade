import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Button } from './Button';

/** A button that opens a floating panel. Escape closes it and returns to the button, and so does a press anywhere else. The panel opens from the button's right edge, unless that would run off the left of the screen. */
export function Dropdown({ label, button, children }: { label: string; button: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [fromRight, setFromRight] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPress = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      wrap.current?.querySelector('button')?.focus();
    };
    document.addEventListener('pointerdown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setFromRight((wrap.current?.getBoundingClientRect().right ?? 999) >= 304); // the panel is 288px wide
          setOpen((o) => !o);
        }}
      >
        {button(open)}
      </Button>
      {open && (
        <div id={id} role="group" aria-label={label} className={cx('absolute top-full z-40 mt-1 w-72 animate-pop rounded-panel border border-hairline bg-surface p-2 shadow-popover', fromRight ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
