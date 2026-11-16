import { useEffect, useRef, useState, type FormEvent } from 'react';
import { tasksApi } from '../api/tasks';
import { SpadeMark } from '../ui/SpadeMark';

const Key = ({ children }: { children: string }) => <kbd className="rounded-control border border-rule px-1.5 py-0.5 font-mono text-time">{children}</kbd>;

/** The desktop app's quick-add panel: one line, opened from any app by the global shortcut. Enter adds a to-do, Esc closes, and the panel goes away either way. */
export default function QuickAddPage() {
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState('');
  const input = useRef<HTMLInputElement>(null);

  // Each time the panel opens it starts over, with the text a spade://add link carried, if any.
  useEffect(
    () =>
      window.spade?.onQuickAdd((text) => {
        setValue(text);
        setProblem('');
        input.current?.focus();
      }),
    [],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    try {
      const task = await tasksApi.create({ title });
      setValue('');
      await window.spade?.quickAddDone({ id: task.id, title: task.title });
    } catch {
      // What was typed stays, so nothing is lost.
      setProblem('Couldn’t add that. Spade may still be starting; try again.');
    }
  }

  return (
    <form onSubmit={submit} className="flex h-screen flex-col bg-surface text-ink">
      <div className="flex min-h-0 flex-1 items-center gap-3 px-4">
        <SpadeMark className="size-6 shrink-0 text-accent" />
        <input
          ref={input}
          autoFocus
          aria-label="Add a to-do"
          placeholder="Add a to-do…"
          autoComplete="off"
          maxLength={200}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && void window.spade?.quickAddDone()}
          className="h-full min-w-0 flex-1 bg-transparent text-section text-ink outline-none placeholder:text-ink-muted focus-visible:outline-none"
        />
      </div>
      <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 text-meta text-ink-muted">
        {problem ? (
          <p role="alert" className="text-danger">{problem}</p>
        ) : (
          <>
            <span><Key>↩</Key> Add</span>
            <span><Key>esc</Key> Close</span>
            <span className="ml-auto">Goes to Tasks, no date</span>
          </>
        )}
      </div>
    </form>
  );
}
