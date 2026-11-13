import { useState, type FormEvent } from 'react';
import { Briefcase, CalendarPlus, ChevronDown, FileUp, ListPlus, Plus } from 'lucide-react';
import { newEventSpan } from '../features/calendar/calendarModel';
import { cx } from '../lib/cx';
import { QuickAddInput } from '../ui/fields';
import { Menu } from '../ui/Menu';
import { useApp, type TaskDefaults } from './AppContext';

/** The one place to add anything: type a title and press Enter for a to-do, or open the menu for the full forms, an application, or a file to read events from. */
export function QuickAdd({ defaults, className }: { defaults?: TaskDefaults; className?: string }) {
  const { addTask, openDialog, chooseFilesToImport } = useApp();
  const [value, setValue] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    const task = await addTask({ title, dueDate: defaults?.dueDate ?? null, calendarId: defaults?.calendarId ?? null, applicationId: defaults?.applicationId ?? null });
    if (task) setValue('');
  }

  return (
    <form onSubmit={submit} className={cx('flex items-center gap-2', className)}>
      <QuickAddInput
        id="quick-add"
        aria-label="Add a task"
        placeholder="Add a task…"
        // N is the shortcut that works today; Ctrl/⌘ K arrives with the command palette.
        shortcut="N"
        className="min-w-0 flex-1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={200}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setValue('');
            e.currentTarget.blur();
          }
        }}
      />
      <Menu
        align="end"
        items={[
          // Whatever you typed carries into the full form.
          {
            label: 'Task (full form)',
            icon: ListPlus,
            onSelect: () => {
              openDialog({ kind: 'task', mode: 'new', defaults: { ...defaults, title: value.trim() || undefined } });
              setValue('');
            },
          },
          { label: 'Event', icon: CalendarPlus, onSelect: () => openDialog({ kind: 'event', mode: 'new', defaults: newEventSpan(null, new Date()) }) },
          { label: 'Application', icon: Briefcase, onSelect: () => openDialog({ kind: 'application', id: 'new' }) },
          { label: 'Import file', icon: FileUp, onSelect: () => chooseFilesToImport() },
        ]}
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label="New"
            title="New: task, event, application, or a file to read events from"
            className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-control bg-accent-fill pr-1.5 pl-2 text-on-accent-fill transition-colors duration-150 ease-out hover:bg-accent-fill/85"
          >
            <Plus className="size-4" aria-hidden />
            <ChevronDown className="size-3.5" aria-hidden />
          </button>
        )}
      />
    </form>
  );
}
