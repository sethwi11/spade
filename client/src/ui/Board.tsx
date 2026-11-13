import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, useDroppable, useSensor, useSensors, type Announcements, type CollisionDetection, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical, MoreHorizontal, Plus } from 'lucide-react';
import { cx } from '../lib/cx';
import { Menu, type MenuItem } from './Menu';
import { useReducedMotion } from './useReducedMotion';

export interface BoardColumn<T> {
  id: string;
  title: string;
  /** The dot beside the name: a token color such as 'var(--danger)'. */
  dot: string;
  items: T[];
  /** False when nothing can be dropped here (Overdue). */
  droppable?: boolean;
  /** The "+ Add" link under the cards. */
  add?: { label: string; onAdd: () => void };
  /** A "+" in the header. */
  plus?: { label: string; onAdd: () => void };
  /** The "..." menu in the header. */
  menu?: MenuItem[];
  /** Shown in place of the cards when there are none. */
  empty?: ReactNode;
  /** Below the cards, inside the scrolling part (Done today). */
  footer?: ReactNode;
  /** On a wide screen, a slim strip that opens when clicked. A phone shows it as an ordinary column. */
  collapsed?: boolean;
  onExpand?: () => void;
}

interface BoardProps<T extends { id: string }> {
  /** What the board is called, for screen readers. */
  label: string;
  columns: BoardColumn<T>[];
  /** What a screen reader calls a card. */
  nameOf: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  /** A card was dropped on a column, just before the card `beforeId` (null: at the end). */
  onDrop: (item: T, columnId: string, beforeId: string | null) => void;
  /** The column a phone starts on. */
  startOn?: string;
}

const COLUMN_PREFIX = 'col:';
const isColumnId = (id: UniqueIdentifier) => String(id).startsWith(COLUMN_PREFIX);

const wideQuery = '(min-width: 768px)';
const subscribeWide = (notify: () => void) => {
  const media = window.matchMedia(wideQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const useWide = () =>
  useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(wideQuery).matches,
    () => true,
  );

/** The card under the pointer wins; failing that the column under it; a keyboard, which has no pointer, goes by the nearest corners. */
const collide: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCorners(args);
};

/**
 * Columns of cards you can drag between. On a wide screen the columns sit side by side and each scrolls on its own; on a phone they are one column wide, swiped between or chosen from the tabs above.
 * Every card has a grip for the keyboard (Space to lift, arrows to move, Space to drop), and the pages give each card a menu that does the same without dragging.
 */
export function Board<T extends { id: string }>({ label, columns, nameOf, renderCard, onDrop, startOn }: BoardProps<T>) {
  const wide = useWide();
  const reduced = useReducedMotion();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [tab, setTab] = useState(startOn ?? columns[0]?.id ?? '');
  const scroller = useRef<HTMLDivElement>(null);
  const tabButtons = useRef(new Map<string, HTMLButtonElement>());

  const items = columns.flatMap((c) => c.items);
  const byId = new Map(items.map((i) => [i.id, i]));
  const columnOf = (id: UniqueIdentifier | null | undefined) => {
    if (id === null || id === undefined) return undefined;
    return isColumnId(id) ? columns.find((c) => c.id === String(id).slice(COLUMN_PREFIX.length)) : columns.find((c) => c.items.some((i) => i.id === id));
  };
  const active = activeId ? byId.get(activeId) : undefined;
  const activeColumn = columnOf(activeId);

  // The row scrolls sideways, and each column starts where its left edge is.
  const columnLeft = (i: number) => (scroller.current?.children[i] as HTMLElement | undefined)?.offsetLeft ?? 0;
  // A phone starts on its column, then follows the swipe.
  useEffect(() => {
    const at = columns.findIndex((c) => c.id === (startOn ?? columns[0]?.id));
    if (!wide && at > 0) scroller.current?.scrollTo({ left: columnLeft(at) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on arrival
  }, []);
  useEffect(() => {
    tabButtons.current.get(tab)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [tab, reduced]);
  const swiped = () => {
    const el = scroller.current;
    if (!el || wide) return;
    const step = columnLeft(1) || el.clientWidth; // a column and the gap after it
    const id = columns[Math.round(el.scrollLeft / step)]?.id;
    if (id) setTab(id);
  };
  const pick = (id: string) => {
    setTab(id);
    scroller.current?.scrollTo({ left: columnLeft(columns.findIndex((c) => c.id === id)), behavior: reduced ? 'auto' : 'smooth' });
  };

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Picked up ${nameOf(byId.get(String(a.id))!)}.`,
    onDragOver: ({ active: a, over }) => (over ? `${nameOf(byId.get(String(a.id))!)} is over ${columnOf(over.id)?.title ?? 'the board'}.` : undefined),
    onDragEnd: ({ active: a, over }) => (over ? `${nameOf(byId.get(String(a.id))!)} was dropped in ${columnOf(over.id)?.title ?? 'the board'}.` : `${nameOf(byId.get(String(a.id))!)} was put back.`),
    onDragCancel: ({ active: a }) => `Moving ${nameOf(byId.get(String(a.id))!)} was cancelled.`,
  };

  function handleDragEnd({ active: dragged, over }: DragEndEvent) {
    setActiveId(null);
    setOverColumn(null);
    const item = byId.get(String(dragged.id));
    const to = columnOf(over?.id);
    if (!item || !over || !to || over.id === dragged.id) return;
    // Dropped on a column (its empty space, header or strip): the end of it. On a card: just before it, or after it when dropped on its lower half.
    let beforeId: string | null = null;
    if (!isColumnId(over.id)) {
      const others = to.items.filter((i) => i.id !== item.id);
      const at = others.findIndex((i) => i.id === over.id);
      const rect = dragged.rect.current.translated;
      const below = rect ? rect.top + rect.height / 2 > over.rect.top + over.rect.height / 2 : false;
      beforeId = others[at + (below ? 1 : 0)]?.id ?? null;
    }
    onDrop(item, to.id, beforeId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collide}
      accessibility={{ announcements }}
      onDragStart={({ active: a }) => setActiveId(String(a.id))}
      onDragOver={({ over }) => setOverColumn(columnOf(over?.id)?.id ?? null)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverColumn(null);
      }}
    >
      <div role="region" aria-label={label} className="flex min-h-0 flex-1 flex-col">
        <div role="tablist" aria-label="Columns" className="-mx-5 mb-3 flex shrink-0 gap-5 overflow-x-auto border-b border-hairline px-5 [scrollbar-width:none] sm:-mx-8 sm:px-8 md:hidden">
          {columns.map((c) => (
            <button
              key={c.id}
              ref={(el) => {
                if (el) tabButtons.current.set(c.id, el);
              }}
              type="button"
              role="tab"
              aria-selected={tab === c.id}
              onClick={() => pick(c.id)}
              className={cx('-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-body whitespace-nowrap transition-colors duration-150 ease-out', tab === c.id ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink')}
            >
              {c.title}
              <span className="rounded-full bg-well px-1.5 font-mono text-time tabular-nums">{c.items.length}</span>
            </button>
          ))}
        </div>

        {/* A phone swipes between whole columns; a wide screen lays them side by side, scrolling sideways only if they would get narrower than 13rem. */}
        <div ref={scroller} onScroll={swiped} className="relative flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] md:snap-none md:[scrollbar-width:auto]">
          {columns.map((c) =>
            c.collapsed && wide ? (
              <CollapsedColumn key={c.id} column={c} highlighted={overColumn === c.id && activeColumn?.id !== c.id} />
            ) : (
              <BoardColumnView key={c.id} column={c} nameOf={nameOf} renderCard={renderCard} highlighted={c.droppable !== false && overColumn === c.id && activeColumn?.id !== c.id} />
            ),
          )}
        </div>
      </div>

      <DragOverlay>
        {active && (
          <div inert className="rotate-1 cursor-grabbing">
            {renderCard(active)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

const headerButton = 'grid size-7 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-card hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';

function BoardColumnView<T extends { id: string }>({ column, nameOf, renderCard, highlighted }: { column: BoardColumn<T>; nameOf: (item: T) => string; renderCard: (item: T) => ReactNode; highlighted: boolean }) {
  const { setNodeRef } = useDroppable({ id: COLUMN_PREFIX + column.id, disabled: column.droppable === false });
  const headingId = `board-${column.id}`;
  return (
    <section aria-labelledby={headingId} className={cx('flex w-full shrink-0 snap-center flex-col rounded-2xl bg-well p-2.5 transition-colors duration-150 ease-out md:min-h-0 md:w-auto md:min-w-52 md:flex-1 md:shrink', highlighted && 'bg-accent-soft ring-2 ring-accent/40')}>
      <header className="mb-2.5 flex shrink-0 items-center gap-2 pl-1.5">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: column.dot }} />
        <h2 id={headingId} className="truncate text-body font-semibold text-ink">
          {column.title}
        </h2>
        <span className="rounded-full bg-card px-2 font-mono text-time text-ink-muted tabular-nums">
          {column.items.length}
          <span className="sr-only"> cards</span>
        </span>
        <span className="ml-auto flex shrink-0">
          {column.plus && (
            <button type="button" aria-label={column.plus.label} title={column.plus.label} onClick={column.plus.onAdd} className={headerButton}>
              <Plus className="size-4" aria-hidden />
            </button>
          )}
          {column.menu && (
            <Menu
              fixed
              align="end"
              items={column.menu}
              trigger={(props) => (
                <button type="button" aria-label={`${column.title} options`} title={`${column.title} options`} {...props} className={headerButton}>
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              )}
            />
          )}
        </span>
      </header>

      {/* On a wide screen this part scrolls by itself; the fade says there is more below. */}
      <div className="relative md:min-h-0 md:flex-1">
        <div ref={setNodeRef} className="min-h-24 md:h-full md:overflow-y-auto md:pb-7">
          <SortableContext items={column.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">
              {column.items.map((item) => (
                <SortableCard key={item.id} id={item.id} name={nameOf(item)}>
                  {renderCard(item)}
                </SortableCard>
              ))}
            </div>
          </SortableContext>
          {column.items.length === 0 && (column.empty ?? <p className="px-2 py-6 text-center text-meta text-ink-muted">Nothing here.</p>)}
          {column.footer}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-b from-transparent to-well max-md:hidden" />
      </div>

      {column.add && (
        <button type="button" onClick={column.add.onAdd} className="mt-2.5 inline-flex shrink-0 items-center gap-1.5 self-start rounded-control px-1 py-0.5 text-body font-medium text-accent-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent">
          <Plus className="size-4" aria-hidden />
          {column.add.label}
        </button>
      )}
    </section>
  );
}

function CollapsedColumn<T>({ column, highlighted }: { column: BoardColumn<T>; highlighted: boolean }) {
  const { setNodeRef } = useDroppable({ id: COLUMN_PREFIX + column.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={column.onExpand}
      aria-label={`Show ${column.title}, ${column.items.length} cards`}
      className={cx('flex w-14 shrink-0 flex-col items-center gap-3 rounded-2xl bg-well py-4 text-ink transition-colors duration-150 ease-out hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent', highlighted && 'bg-accent-soft ring-2 ring-accent/40')}
    >
      <ChevronRight className="size-4 text-ink-muted" aria-hidden />
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: column.dot }} />
      <span aria-hidden className="text-body font-semibold [writing-mode:vertical-rl]">
        {column.title}
      </span>
      <span aria-hidden className="rounded-full bg-card px-2 font-mono text-time text-ink-muted tabular-nums">
        {column.items.length}
      </span>
    </button>
  );
}

function SortableCard({ id, name, children }: { id: string; name: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...listeners} className={cx('group/drag relative cursor-grab touch-manipulation', isDragging && 'opacity-40')}>
      {children}
      {/* The grip is the keyboard's way to pick the card up (a pointer can grab the whole card, and a touch screen uses the card's menu). */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        aria-label={`Move ${name}`}
        className="absolute right-2.5 bottom-2.5 grid size-6 place-items-center rounded-control text-ink-muted opacity-0 transition-opacity duration-150 ease-out group-hover/drag:opacity-100 focus-visible:opacity-100 max-md:hidden"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
    </div>
  );
}
