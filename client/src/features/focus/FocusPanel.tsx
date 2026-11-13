import type { ReactNode } from 'react';
import { Square, Timer } from 'lucide-react';
import type { PlanItem } from '@todo/shared';
import { cx } from '../../lib/cx';
import { formatCountdown } from '../../lib/dates';
import { Button } from '../../ui/Button';
import { Soundtrack } from './Soundtrack';
import { useFocusTimer } from './useFocusTimer';

/** The size of the buttons on the home screen, which is read from across the room. */
export const BIG_BUTTON = 'h-11 px-5 text-title';

/** On the Now card: Start focus on a focus block (Pomodoro until the block ends), and its soundtrack. `actions` are more buttons for the same row (the home screen's Add task and Add event). */
export function FocusPanel({ item, big = false, actions }: { item: PlanItem; big?: boolean; actions?: ReactNode }) {
  const { state, now, start, stop, settings } = useFocusTimer();
  const running = state?.key === item.key ? state : null;
  if (!item.focus && !item.soundtrack && !actions) return null;
  const left = running ? running.phaseEnd - now : 0;
  const share = running ? 1 - left / Math.max(1, running.phaseEnd - running.phaseStart) : 0;
  const mmss = `${Math.floor(Math.max(0, left) / 60_000)}:${String(Math.floor((Math.max(0, left) % 60_000) / 1000)).padStart(2, '0')}`;

  return (
    <div className={cx(!big && 'mt-3 border-t border-hairline pt-3')}>
      {running ? (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="text-label text-ink-muted uppercase">{running.phase === 'focus' ? `Focus ${running.done + 1}` : running.done % settings.longBreakEvery === 0 ? 'Long break' : 'Break'}</p>
            {/* Not a live region: a second-by-second announcement would be noise. */}
            <p className={big ? 'font-mono text-[clamp(1.75rem,3.5vw,3rem)] tabular-nums' : 'font-mono text-section tabular-nums'}>{mmss}</p>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-hairline" role="progressbar" aria-label="This interval" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-accent" style={{ width: `${share * 100}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={Square} className={big ? BIG_BUTTON : undefined} onClick={stop}>
              Stop
            </Button>
            {actions}
            <span className="text-meta text-ink-muted">{running.done} done · ends with the block in {formatCountdown(running.blockEnd - now)}</span>
          </div>
        </div>
      ) : (
        (item.focus || actions) && (
          <div className="flex flex-wrap gap-2">
            {item.focus && (
              <Button variant="primary" icon={Timer} className={big ? BIG_BUTTON : undefined} onClick={() => start(item)}>
                Start focus · {Math.max(1, Math.min(settings.focusMinutes, Math.floor((new Date(`${item.end}:00`).getTime() - Date.now()) / 60_000)))} min
              </Button>
            )}
            {actions}
          </div>
        )
      )}
      {item.soundtrack && (
        <div className="mt-2">
          <Soundtrack name={item.soundtrack} />
        </div>
      )}
    </div>
  );
}
