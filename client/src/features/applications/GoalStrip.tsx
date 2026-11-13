import { Filter } from 'lucide-react';
import { applicationStats, goalProgress, type Application } from '@todo/shared';
import { longDate } from '../../lib/dates';
import { cx } from '../../lib/cx';
import { percent } from './format';

interface GoalStripProps {
  applications: Application[];
  goal: number;
  targetDate: string;
  today: string;
  /** How many are waiting on a follow-up, and whether the board is showing only those. */
  followUps: number;
  onlyFollowUps: boolean;
  onToggleFollowUps: () => void;
  /** Opens the place the goal is edited. */
  onEditGoal: () => void;
}

/** The top of the tracker, kept slim so the board is the focus: offers against your goal, the two rates worth watching, and the follow-ups waiting. */
export function GoalStrip({ applications, goal, targetDate, today, followUps, onlyFollowUps, onToggleFollowUps, onEditGoal }: GoalStripProps) {
  const progress = goalProgress(applications, goal, targetDate, today);
  const stats = applicationStats(applications, today);
  const timeLeft = progress.daysLeft > 0 ? `${progress.daysLeft} day${progress.daysLeft === 1 ? '' : 's'} left` : progress.daysLeft === 0 ? 'the target date is today' : `${-progress.daysLeft} day${progress.daysLeft === -1 ? '' : 's'} past the target date`;

  return (
    <section aria-label="Goal and stats" className="mb-5 flex shrink-0 flex-wrap items-center gap-x-8 gap-y-3 rounded-card border border-hairline bg-card px-5 py-3.5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <p className="text-label text-ink-muted uppercase">Offers</p>
          <p className="font-display text-section leading-tight tabular-nums">
            {progress.offers} <span className="text-title text-ink-muted">of {progress.goal}</span>
          </p>
        </div>
        <div className="min-w-48">
          <div role="progressbar" aria-label="Offers toward your goal" aria-valuenow={Math.min(progress.offers, progress.goal)} aria-valuemin={0} aria-valuemax={progress.goal} className="h-1.5 overflow-hidden rounded-full bg-rule/50">
            <div className="h-full rounded-full bg-accent-fill transition-[width] duration-150 ease-out" style={{ width: `${Math.min(100, (progress.offers / progress.goal) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-meta whitespace-nowrap text-ink-muted">
            by {longDate(targetDate)} · {timeLeft} ·{' '}
            <button type="button" onClick={onEditGoal} className="rounded-control text-ink underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent">
              Change goal
            </button>
          </p>
        </div>
      </div>

      <span aria-hidden className="h-8 w-px bg-hairline max-md:hidden" />

      <dl className="flex gap-7">
        <Stat label="Applied" value={String(stats.applied)} note={`${stats.perWeek.toFixed(1)} a week lately`} />
        <Stat label="Heard back" value={percent(stats.responseRate)} note={`${stats.responded} of ${stats.applied}`} />
        <Stat label="Interviews" value={percent(stats.interviewRate)} note={`${stats.interviewed} of ${stats.applied}`} />
      </dl>

      {(followUps > 0 || onlyFollowUps) && (
        <button
          type="button"
          aria-pressed={onlyFollowUps}
          onClick={onToggleFollowUps}
          className={cx('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-meta font-medium transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:ml-auto', onlyFollowUps ? 'bg-ink text-paper' : 'bg-accent-fill/25 text-ink hover:bg-accent-fill/40')}
        >
          <Filter className={cx('size-3.5', !onlyFollowUps && 'text-accent-ink')} aria-hidden />
          {followUps} to follow up
        </button>
      )}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div title={note}>
      <dt className="text-label text-ink-muted uppercase">{label}</dt>
      <dd className="font-display text-title leading-tight tabular-nums">{value}</dd>
      <dd className="sr-only">{note}</dd>
    </div>
  );
}
