import type { ReactNode } from 'react';

/** An on/off switch with its words beside it. A real checkbox underneath, announced as a switch. */
export function Switch({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-2 text-body text-ink">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-[18px] w-8 shrink-0 rounded-full bg-rule transition-colors duration-150 ease-out peer-checked:bg-accent-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-3.5 after:rounded-full after:bg-card after:shadow-card after:transition-transform after:duration-150 after:ease-out peer-checked:after:translate-x-3.5"
      />
      {children}
    </label>
  );
}
