import { useState } from 'react';
import { APPLICATION_COLUMNS, applicationColumnOf, COLUMN_SORTS, sortColumn, type Application, type ApplicationStatus, type CardCounts, type ColumnSort } from '@todo/shared';
import { useApp } from '../../app/AppContext';
import { usePersistedState } from '../../hooks/usePersistedState';
import { Board, type BoardColumn } from '../../ui/Board';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Panel';
import { ApplicationCard } from './ApplicationCard';

const DOT: Record<string, string> = { wishlist: 'var(--ink-muted)', applied: 'var(--cal-dusty-blue)', assessment: 'var(--cal-plum)', interviewing: 'var(--accent)', offer: 'var(--success)', closed: 'var(--cal-slate)' };
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Closed is a record, so it reads newest first; the others keep the order you dragged them into. */
export const sortOf = (sorts: Record<string, ColumnSort>, columnId: string): ColumnSort => sorts[columnId] ?? (columnId === 'closed' ? 'newest' : 'manual');

interface ApplicationsBoardProps {
  applications: Application[];
  today: string;
  followUpIds: ReadonlySet<string>;
  counts: ReadonlyMap<string, CardCounts>;
  files: Record<string, number> | undefined;
  sorts: Record<string, ColumnSort>;
  onSort: (columnId: string, sort: ColumnSort) => void;
  /** A card was dropped in `status`, just before `beforeId` (null: at the end of that column). */
  onMove: (application: Application, status: ApplicationStatus, beforeId: string | null) => void;
  onFollowUp: (application: Application, answer: 'accept' | 'dismiss') => void;
}

/** The pipeline: a column per stage (Online Assessment reads "Assessment"; Rejected and Withdrawn share Closed, which starts folded away), cards you drag between them. */
export function ApplicationsBoard({ applications, today, followUpIds, counts, files, sorts, onSort, onMove, onFollowUp }: ApplicationsBoardProps) {
  const { openDialog } = useApp();
  const [folded, setFolded] = usePersistedState<string[]>('voice-todo.applicationFolded', ['closed'], isStrings);
  const [closing, setClosing] = useState<Application | null>(null);
  const toggleFolded = (id: string) => setFolded(folded.includes(id) ? folded.filter((f) => f !== id) : [...folded, id]);

  const columns: BoardColumn<Application>[] = APPLICATION_COLUMNS.map((c) => {
    const statuses: readonly ApplicationStatus[] = c.statuses;
    const sort = sortOf(sorts, c.id);
    return {
      id: c.id,
      title: c.title,
      dot: DOT[c.id]!,
      items: sortColumn(
        applications.filter((a) => statuses.includes(a.status)),
        sort,
      ),
      plus: c.id === 'closed' ? undefined : { label: `Add to ${c.title}`, onAdd: () => openDialog({ kind: 'application', id: 'new', status: statuses[0] }) },
      menu: [...COLUMN_SORTS.map((s) => ({ label: `Sort: ${s.label}`, hint: sort === s.id ? 'On' : undefined, onSelect: () => onSort(c.id, s.id) })), { label: folded.includes(c.id) ? 'Show column' : 'Fold column away', onSelect: () => toggleFolded(c.id) }],
      collapsed: folded.includes(c.id),
      onExpand: () => toggleFolded(c.id),
      empty: <p className="px-2 py-6 text-center font-display text-title text-ink-muted italic">Nothing here yet.</p>,
    };
  });

  function drop(app: Application, columnId: string, beforeId: string | null) {
    const column = APPLICATION_COLUMNS.find((c) => c.id === columnId);
    if (!column) return;
    if (applicationColumnOf(app.status) === columnId) {
      // Within its own column only your own order can change (and Closed, with two statuses, has none).
      if (sortOf(sorts, columnId) === 'manual' && column.statuses.length === 1) onMove(app, app.status, beforeId);
      return;
    }
    // Closed is two statuses, so ask which.
    if (columnId === 'closed') setClosing(app);
    else onMove(app, column.statuses[0], sortOf(sorts, columnId) === 'manual' ? beforeId : null);
  }

  const finish = (status: ApplicationStatus) => {
    const app = closing;
    setClosing(null);
    if (app) onMove(app, status, null);
  };

  return (
    <>
      <Board
        label="Applications by stage"
        columns={columns}
        nameOf={(a) => a.company}
        startOn="applied"
        onDrop={drop}
        renderCard={(a) => <ApplicationCard application={a} today={today} followUp={followUpIds.has(a.id)} counts={counts.get(a.id)} files={files?.[a.id] ?? 0} onMove={(status) => onMove(a, status, null)} onFollowUp={(answer) => onFollowUp(a, answer)} />}
      />
      <Dialog open={closing !== null} onClose={() => setClosing(null)} title="Rejected or withdrawn?">
        <p className="mb-4 text-body text-ink-muted">“{closing?.company}” is moving to Closed. Which is it?</p>
        <div className="flex gap-2">
          <Button variant="secondary" data-autofocus onClick={() => finish('Rejected')}>
            Rejected
          </Button>
          <Button variant="secondary" onClick={() => finish('Withdrawn')}>
            Withdrawn
          </Button>
        </div>
      </Dialog>
    </>
  );
}
