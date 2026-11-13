import { Link, useNavigate } from 'react-router';
import { CalendarDays, ChevronDown, CircleCheck, Clock, ListChecks, MoreHorizontal, Paperclip, Video, type LucideIcon } from 'lucide-react';
import { APPLICATION_STATUSES, appliedDate, daysBetween, monogramColor, type Application, type ApplicationStatus, type CardCounts } from '@todo/shared';
import { useApp } from '../../app/AppContext';
import { calendarVars } from '../../lib/calendarColors';
import { shortDate } from '../../lib/dates';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Menu } from '../../ui/Menu';
import { ago } from './format';
import { useApplicationShortcuts } from './useApplicationShortcuts';

/** What the status pill on a card says, when it matters: an offer, how a closed one ended, a wait that has gone on too long, or a wishlist deadline coming up. */
export function applicationPill(a: Pick<Application, 'status' | 'deadline'>, followUp: boolean, today: string): { text: string; tone: 'honey' | 'green' | 'plain'; icon?: LucideIcon } | null {
  if (a.status === 'Offer') return { text: 'Offer', tone: 'green', icon: CircleCheck };
  if (a.status === 'Rejected' || a.status === 'Withdrawn') return { text: a.status, tone: 'plain' };
  if (followUp) return { text: 'Follow up?', tone: 'honey', icon: Clock };
  if (a.status === 'Wishlist' && a.deadline && daysBetween(today, a.deadline) <= 7) return { text: `Deadline ${shortDate(a.deadline)}`, tone: 'honey', icon: CalendarDays };
  return null;
}

interface ApplicationCardProps {
  application: Application;
  today: string;
  followUp: boolean;
  counts?: CardCounts;
  files: number;
  onMove: (status: ApplicationStatus) => void;
  onFollowUp: (answer: 'accept' | 'dismiss') => void;
}

/** One application as a card: a pill when something needs saying, the company's letter, company and role, where and when, and what is tied to it. */
export function ApplicationCard({ application: a, today, followUp, counts, files, onMove, onFollowUp }: ApplicationCardProps) {
  const { openDialog } = useApp();
  const { addInterview, addTodo } = useApplicationShortcuts();
  const navigate = useNavigate();
  const page = `/applications/${a.id}`;
  const pill = applicationPill(a, followUp, today);
  const applied = appliedDate(a);
  const line = [a.location, a.status === 'Wishlist' ? (a.deadline ? `Deadline ${shortDate(a.deadline)}` : null) : applied ? `Applied ${ago(daysBetween(applied, today))}` : null].filter(Boolean).join(' · ');
  const foot = [
    counts && counts.todos > 0 && { Icon: ListChecks, n: counts.todos, label: 'To-dos' },
    counts && counts.interviews > 0 && { Icon: Video, n: counts.interviews, label: 'Interviews and dates' },
    files > 0 && { Icon: Paperclip, n: files, label: 'Files' },
  ].filter((f): f is { Icon: LucideIcon; n: number; label: string } => !!f);

  return (
    <Card>
      {pill && (
        <div className="mb-3 pr-8">
          {followUp && a.status === 'Applied' ? (
            // The follow-up suggestion is answered right here: add the to-do, or dismiss it.
            <Menu
              fixed
              items={[
                { label: 'Add follow-up to-do', onSelect: () => onFollowUp('accept') },
                { label: 'Dismiss', onSelect: () => onFollowUp('dismiss') },
              ]}
              trigger={(props) => (
                <button type="button" {...props} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent">
                  <Chip tone="honey" icon={Clock} after={<ChevronDown className="size-3.5 shrink-0 text-accent-ink" aria-hidden />}>
                    {pill.text}
                  </Chip>
                </button>
              )}
            />
          ) : (
            <Chip tone={pill.tone} icon={pill.icon}>
              {pill.text}
            </Chip>
          )}
        </div>
      )}

      <div className="flex items-center gap-2.5 pr-6">
        <span aria-hidden style={calendarVars(monogramColor(a.company))} className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-(color:--c-strong) font-display text-body font-semibold text-ink">
          {a.company.trim()[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <Link to={page} title={a.company} className="block truncate text-body leading-tight font-semibold text-ink hover:underline focus-visible:underline">
            {a.company}
          </Link>
          <p title={a.role} className="truncate text-meta text-ink-muted">
            {a.role}
          </p>
        </div>
      </div>

      {line && <p className="mt-3 line-clamp-2 text-meta text-ink-muted">{line}</p>}

      {foot.length > 0 && (
        <div className="mt-3 flex items-center gap-4 border-t border-hairline pt-3 text-time text-ink-muted">
          {foot.map(({ Icon, n, label }) => (
            <Link key={label} to={page} title={label} className="inline-flex items-center gap-1.5 hover:text-ink focus-visible:text-ink">
              <Icon className="size-3.5" aria-hidden />
              <span className="font-mono tabular-nums">{n}</span>
              <span className="sr-only">{label}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="absolute top-2.5 right-2.5">
        <Menu
          fixed
          align="end"
          items={[
            { label: 'Open', onSelect: () => navigate(page) },
            { label: 'Add interview', onSelect: () => addInterview(a) },
            { label: 'Add to-do', onSelect: () => addTodo(a) },
            ...APPLICATION_STATUSES.filter((s) => s !== a.status).map((s) => ({ label: `Move to ${s}`, onSelect: () => onMove(s) })),
            { label: 'Edit or delete…', onSelect: () => openDialog({ kind: 'application', id: a.id }) },
          ]}
          trigger={(props) => (
            <button type="button" aria-label={`More for ${a.company}`} title="More" {...props} className="grid size-7 place-items-center rounded-control text-ink-muted hover:bg-well hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent">
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          )}
        />
      </div>
    </Card>
  );
}
