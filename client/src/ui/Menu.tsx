import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../lib/cx';

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  disabled?: boolean;
  /** Small right-aligned note, e.g. why an item is unavailable. */
  hint?: string;
}

interface MenuProps {
  /** Renders the button that opens the menu. Spread `props` onto it. */
  trigger: (props: {
    ref: (el: HTMLButtonElement | null) => void;
    onClick: () => void;
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    'aria-controls': string | undefined;
    onKeyDown: (e: React.KeyboardEvent) => void;
  }) => ReactNode;
  items: MenuItem[];
  /** Which edge of the trigger the menu lines up with. */
  align?: 'start' | 'end';
  /** Open below (default) or above the trigger. */
  side?: 'bottom' | 'top';
  className?: string;
  /** Position the menu on the screen instead of inside its parent, so a scrolling column can't clip it. It closes when anything scrolls. */
  fixed?: boolean;
}

/** A dropdown menu with the usual keyboard behavior (Enter/Space/ArrowDown open it; arrows, Home, End move; Escape closes and refocuses the button). */
export function Menu({ trigger, items, align = 'start', side = 'bottom', className, fixed = false }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState<CSSProperties>({});
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const enabledItems = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not([aria-disabled=true])') ?? [])];

  // Close on a pointer press anywhere outside the menu and its button.
  useEffect(() => {
    if (!open) return;
    const onPress = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPress);
    return () => document.removeEventListener('pointerdown', onPress);
  }, [open]);

  // A fixed menu is placed from its button when it opens, so anything that scrolls or resizes closes it.
  useEffect(() => {
    if (!open || !fixed) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, fixed]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) enabledItems()[0]?.focus();
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const list = enabledItems();
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    const go = (n: number) => {
      e.preventDefault();
      list[(n + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') close(false);
  }

  return (
    <div ref={wrapRef} className={cx('relative', className)}>
      {trigger({
        ref: (el) => {
          triggerRef.current = el;
        },
        onClick: () => {
          if (fixed && !open && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            const below = window.innerHeight - r.bottom > items.length * 32 + 24; // room for every item
            setSpot({ ...(below ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }), ...(align === 'end' ? { right: window.innerWidth - r.right } : { left: r.left }) });
          }
          setOpen((o) => !o);
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? id : undefined,
        onKeyDown: (e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        },
      })}
      {open && (
        <div
          ref={menuRef}
          id={id}
          role="menu"
          onKeyDown={onMenuKeyDown}
          style={fixed ? spot : undefined}
          className={cx(
            'z-40 min-w-52 animate-pop rounded-panel border border-hairline bg-surface p-1 shadow-popover',
            fixed ? 'fixed' : cx('absolute', side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1', align === 'start' ? 'left-0' : 'right-0'),
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              aria-disabled={item.disabled || undefined}
              onClick={() => {
                if (item.disabled) return;
                close(false);
                item.onSelect?.();
              }}
              className={cx(
                'flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-body transition-colors duration-150 ease-out',
                item.disabled ? 'cursor-not-allowed text-ink-muted' : 'text-ink hover:bg-accent-soft focus-visible:bg-accent-soft',
              )}
            >
              {item.icon && <item.icon className="size-4" aria-hidden />}
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.hint && <span className="text-meta text-ink-muted">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
