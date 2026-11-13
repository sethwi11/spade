import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { addDays, comingUpDays, COMING_UP_DAYS, type Task } from '@todo/shared';
import { formatDueDate, parseLocalISODate, shortDate } from '../../lib/dates';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Panel';
import { Input } from '../../ui/fields';

/** What the small question is: where it came from decides what it offers. */
export type MoveMode = 'soon' | 'later' | 'any';

interface MoveDialogProps {
  task: Task | null;
  mode: MoveMode;
  today: string;
  onClose: () => void;
  /** A date, or null to clear it. */
  onChoose: (task: Task, dueDate: string | null) => void;
}

const TITLE: Record<MoveMode, string> = { soon: 'Move to which day?', later: 'Clear the date or pick one?', any: 'Pick a day' };

/** The question after a card is dropped on Coming up (which day) or Later (clear the date, or pick one), and what the card's "Pick a day" asks. Nothing moves until a choice is made. */
export function MoveDialog({ task, mode, today, onClose, onChoose }: MoveDialogProps) {
  const [date, setDate] = useState('');
  // Later starts a week and a day out; the other two can be any day from today.
  const earliest = mode === 'later' ? addDays(today, COMING_UP_DAYS + 1) : today;
  const choose = (dueDate: string | null) => {
    if (!task) return;
    setDate('');
    onClose();
    onChoose(task, dueDate);
  };
  return (
    <Dialog open={task !== null} onClose={onClose} title={TITLE[mode]}>
      <p className="mb-4 text-body text-ink-muted">“{task?.title}”</p>
      {mode !== 'later' && (
        <div role="group" aria-label="The next seven days" className="mb-4 grid grid-cols-4 gap-2">
          {comingUpDays(today).map((day, i) => (
            <button key={day} type="button" data-autofocus={i === 0 || undefined} onClick={() => choose(day)} className="rounded-control border border-rule px-1 py-2 text-center text-body text-ink transition-colors duration-150 ease-out hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent">
              <span className="block font-medium">{i === 0 ? 'Tomorrow' : parseLocalISODate(day).toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="font-mono text-time text-ink-muted">{shortDate(day)}</span>
            </button>
          ))}
        </div>
      )}
      {mode !== 'soon' && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-label text-ink-muted uppercase">{mode === 'later' ? 'Pick a date' : 'Or another date'}</span>
            <Input type="date" value={date} min={earliest} onChange={(e) => setDate(e.target.value)} />
          </label>
          <Button variant="secondary" icon={CalendarDays} disabled={!date || date < earliest} onClick={() => choose(date)}>
            {date ? `Move to ${formatDueDate(date, today)}` : 'Move'}
          </Button>
          {mode === 'later' && (
            <Button variant="ghost" data-autofocus onClick={() => choose(null)}>
              Clear the date
            </Button>
          )}
        </div>
      )}
    </Dialog>
  );
}
