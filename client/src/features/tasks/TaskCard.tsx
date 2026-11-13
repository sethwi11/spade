import { CalendarDays, CalendarClock, Clock, ListChecks, MoreHorizontal, Paperclip, Repeat } from 'lucide-react';
import { formatMinutes, taskColumn, type Task } from '@todo/shared';
import { useApp } from '../../app/AppContext';
import { cardWhen } from '../../lib/taskCard';
import { cx } from '../../lib/cx';
import { Card } from '../../ui/Card';
import { Checkbox } from '../../ui/Checkbox';
import { Chip } from '../../ui/Chip';
import { Menu } from '../../ui/Menu';
import { PRIORITY_LABEL } from '../../ui/TaskRow';
import { useLeave } from '../../ui/useLeave';
import { useAttachmentCounts } from '../attachments/useAttachments';

export type MoveHow = 'today' | 'pick' | 'clear';

interface TaskCardProps {
  task: Task;
  today: string;
  /** Moving it without dragging: to today, to a day it asks for, or to no date. */
  onMove: (task: Task, how: MoveHow) => void;
  /** Choosing several to-dos: the check box picks the card instead of completing it. */
  select?: { picked: boolean; onToggle: () => void };
}

/** One to-do as a card: the check, the title, its notes (two lines), its calendar and day or time, and small icons for what else it has. A finished one is dimmed and struck through. */
export function TaskCard({ task, today, onMove, select }: TaskCardProps) {
  const { calendarsById, toggleTask, openDialog, removeTask, scheduledMinutesByTask } = useApp();
  const files = useAttachmentCounts('task')?.[task.id] ?? 0;
  const done = task.status === 'done';
  const column = taskColumn(task, today);
  // Only an open to-do leaves its column when checked: it fades out, then moves to Done today.
  const { leaving, checked, toggle } = useLeave(done, !done, () => void toggleTask(task));
  const calendar = task.calendarId ? calendarsById.get(task.calendarId) : undefined;
  const when = column ? cardWhen(task, column, today) : null;
  const planned = scheduledMinutesByTask.get(task.id);
  const edit = () => openDialog({ kind: 'task', mode: 'edit', id: task.id });

  const facts = [
    // The "Until Tue" chip already carries the repeat icon.
    task.recurrence !== 'none' && when?.kind !== 'until' && { Icon: Repeat, label: 'Repeats', text: null },
    planned && !done && { Icon: CalendarClock, label: 'Time set aside', text: formatMinutes(planned) },
    task.subtasks.length > 0 && { Icon: ListChecks, label: 'Subtasks done', text: `${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}` },
    files > 0 && { Icon: Paperclip, label: 'Files', text: files > 1 ? String(files) : null },
  ].filter((f): f is { Icon: typeof Repeat; label: string; text: string | null } => !!f);

  return (
    // Collapse: animating a grid row from 1fr to 0fr smoothly shrinks the card to nothing.
    <div data-collapsing={leaving === 'collapsing'} className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-250 ease-out data-[collapsing=true]:grid-rows-[0fr] data-[collapsing=true]:opacity-0">
      <div data-collapsing={leaving === 'collapsing'} className="min-h-0 data-[collapsing=true]:overflow-hidden">
        <Card className={cx(done && 'opacity-60', select?.picked && 'ring-2 ring-accent')}>
          {/* High is the only priority that marks the card, and it is a bar plus the words for a screen reader. */}
          {task.priority === 'high' && !done && <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-accent" />}
          <span className="sr-only">{PRIORITY_LABEL[task.priority]}.</span>

          <div className="flex items-start gap-3">
            {select ? (
              <Checkbox round checked={select.picked} onChange={select.onToggle} label={`Select "${task.title}"`} className="-m-1.5" />
            ) : (
              <Checkbox round checked={checked} onChange={toggle} label={`Mark "${task.title}" as ${checked ? 'not done' : 'done'}`} className="-m-1.5" />
            )}
            <div className="min-w-0 flex-1">
              <button type="button" onClick={select ? select.onToggle : edit} className="block max-w-full pr-6 text-left text-body leading-snug font-medium text-ink">
                <span data-done={checked} className="strike break-words">
                  {task.title}
                </span>
              </button>
              {task.notes && <p className="mt-1 line-clamp-2 text-meta break-words text-ink-muted">{task.notes}</p>}

              {(calendar || when) && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {calendar && <Chip color={calendar.color}>{calendar.name}</Chip>}
                  {when && (
                    <Chip icon={when.kind === 'time' ? Clock : when.kind === 'until' ? Repeat : CalendarDays} tone={when.kind === 'overdue' && !checked ? 'danger' : 'plain'}>
                      {when.kind === 'overdue' && !checked && <span className="sr-only">Overdue: </span>}
                      {when.text}
                    </Chip>
                  )}
                </div>
              )}

              {facts.length > 0 && (
                <div className="mt-2.5 flex items-center gap-3 text-time text-ink-muted">
                  {facts.map(({ Icon, label, text }) => (
                    <span key={label} title={label} className="inline-flex items-center gap-1">
                      <Icon className="size-3.5" aria-hidden />
                      <span className="sr-only">{label}{text ? ':' : ''}</span>
                      {text && <span className="font-mono tabular-nums">{text}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!done && (
            <div className="absolute top-2.5 right-2.5">
              <Menu
                fixed
                align="end"
                items={[
                  { label: 'Move to Today', disabled: column === 'today', onSelect: () => onMove(task, 'today') },
                  { label: 'Pick a day…', onSelect: () => onMove(task, 'pick') },
                  { label: 'Clear date', disabled: task.dueDate === null, onSelect: () => onMove(task, 'clear') },
                  { label: 'Set aside time…', onSelect: () => openDialog({ kind: 'schedule', taskId: task.id }) },
                  { label: 'Edit', onSelect: edit },
                  { label: 'Delete', onSelect: () => void removeTask(task) },
                ]}
                trigger={(props) => (
                  <button type="button" aria-label={`More for “${task.title}”`} title="More" {...props} className="grid size-7 place-items-center rounded-control text-ink-muted hover:bg-well hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent">
                    <MoreHorizontal className="size-4" aria-hidden />
                  </button>
                )}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
