import type { ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { cx } from '../../lib/cx';
import { SpadeMark } from '../../ui/SpadeMark';
import { NAV, PageStrip, RAIL_GRADIENT, RailItem } from './Boards';
import { Modes, Section } from './shared';

// Static mockups of the Mac window's top-left corner at real size (made-up data): where the window buttons sit and what drags the window.

/** The Mac's close, minimize and zoom buttons, in token colors. */
const Lights = ({ className }: { className: string }) => (
  <span aria-hidden className={cx('absolute z-10 flex gap-2', className)}>
    {['bg-danger', 'bg-accent-fill', 'bg-success'].map((c) => (
      <span key={c} className={cx('size-3 rounded-full', c)} />
    ))}
  </span>
);

/** Marks the part of the page that drags the window. Invisible in the real app. */
const DragStrip = ({ className }: { className: string }) => (
  <span aria-hidden className={cx('absolute z-10 grid place-items-center border border-dashed border-rule text-time text-ink-muted', className)}>
    drags the window
  </span>
);

function MockRail({ top, open = false }: { top: string; open?: boolean }) {
  return (
    <nav aria-label="Main" style={RAIL_GRADIENT} className={cx('flex shrink-0 flex-col pb-5 text-on-rail', top, open ? 'w-58' : 'w-22 items-center')}>
      {open ? (
        <div className="flex items-center gap-2.5 px-5">
          <SpadeMark className="size-9 shrink-0 text-accent-fill" />
          <span className="font-display text-section italic">Spade</span>
          <PanelLeftClose className="ml-auto size-[18px] text-on-rail-muted" aria-hidden />
        </div>
      ) : (
        <>
          <SpadeMark className="size-9 shrink-0 text-accent-fill" />
          <PanelLeftOpen className="mt-4 size-[18px] shrink-0 text-on-rail-muted" aria-hidden />
        </>
      )}
      <ul className={cx('w-full', open ? 'mt-6 px-3' : 'mt-3')}>
        {NAV.slice(0, open ? 4 : 2).map(([label, icon, count]) =>
          open ? (
            <li key={label} className={cx('flex h-11 items-center gap-3 rounded-xl px-3 text-body', label === 'Today' ? 'bg-accent-fill/25 font-semibold' : 'font-medium text-on-rail-muted')}>
              {label}
            </li>
          ) : (
            <RailItem key={label} label={label} icon={icon} count={count} state={label === 'Today' ? 'active' : 'idle'} />
          ),
        )}
      </ul>
      {!open && (
        <ul className="mt-auto w-full border-t border-rail-rule pt-2">
          <RailItem label="Settings" icon={Settings} count={0} state="idle" />
        </ul>
      )}
    </nav>
  );
}

const Frame = ({ children, label, narrow = false }: { children: ReactNode; label: string; narrow?: boolean }) => (
  <div>
    <div role="img" aria-label={label} className={cx('relative flex h-[380px] overflow-hidden rounded-panel border border-hairline bg-paper', narrow && 'max-w-[420px] flex-col')}>
      <div inert className={cx('flex size-full', narrow && 'flex-col')}>
        {children}
      </div>
    </div>
    <p className="mt-2 text-meta text-ink-muted">{label}</p>
  </div>
);

const HomeTop = ({ className }: { className: string }) => (
  <div className={cx('min-w-0 flex-1 px-10', className)}>
    <p className="font-mono text-[4rem] leading-none tabular-nums">2:14 PM</p>
    <p className="mt-2 font-display text-section text-ink-muted">Monday, November 16</p>
    <div className="mt-8 h-40 rounded-panel border border-rule border-l-8 bg-surface" />
  </div>
);

export function Desktop() {
  return (
    <Section id="desktop" title="Desktop window: the title bar" intro="The top-left corner of the Mac window at real size. A hides the title bar and puts the window buttons on the rail; B keeps a slim bar across the top. A was chosen and built; B is kept for the record.">
      <Modes>
        <div className="grid gap-5 sm:grid-cols-2">
          <Frame label="A · Buttons on the rail. The rail runs to the top; the Spade mark moves down 28px. The top 24px of every page drags the window and costs no space (pages already have that much padding).">
            <Lights className="top-[18px] left-[18px]" />
            <DragStrip className="top-0 right-0 left-22 h-6" />
            <MockRail top="pt-12" />
            <PageStrip />
          </Frame>
          <Frame label="B · A slim bar. 38px across the whole window: rail color over the rail, the page's name over the page. Every page loses 38px of height.">
            <Lights className="top-[13px] left-[18px]" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-[38px] shrink-0">
                <span style={RAIL_GRADIENT} className="w-22" />
                <span className="grid flex-1 place-items-center border-b border-hairline text-meta font-medium text-ink-muted">Today</span>
              </div>
              <div className="flex min-h-0 flex-1">
                <MockRail top="pt-3" />
                <PageStrip />
              </div>
            </div>
          </Frame>
          <Frame label="A · The rail opened: the buttons sit above the Spade name, clear of the collapse button.">
            <Lights className="top-[18px] left-[18px]" />
            <DragStrip className="top-0 right-0 left-58 h-6" />
            <MockRail top="pt-12" open />
            <PageStrip />
          </Frame>
          <Frame label="A · Home, which has no rail: the buttons float over the page and the clock starts 20px lower. (In B, Home gets the same 38px bar.)">
            <Lights className="top-[18px] left-[18px]" />
            <DragStrip className="inset-x-0 top-0 h-6 pl-24" />
            <HomeTop className="pt-13" />
          </Frame>
          <Frame narrow label="A and B · A narrow window (420 wide): the phone layout's top bar drags the window, with the Spade name moved clear of the buttons.">
            <Lights className="top-[18px] left-[18px]" />
            <div className="flex h-12 shrink-0 items-center justify-center gap-2 border-b border-hairline">
              <SpadeMark className="size-6" />
              <span className="font-display text-section italic">Spade</span>
            </div>
            <PageStrip />
          </Frame>
        </div>
      </Modes>
    </Section>
  );
}
