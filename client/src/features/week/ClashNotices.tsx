import { useMemo } from 'react';
import { fitAround, weeklyClashes, type WeekTemplate } from '@todo/shared';
import { useRoutine } from '../../actions/useRoutineActions';
import { useApp } from '../../app/AppContext';
import { WEEKDAY_NAME } from '../../lib/dates';
import { Button } from '../../ui/Button';
import { formatTimeRange } from '../calendar/format';
import { classSlots } from './classSlots';

/** "A class overlaps a block every week": one notice for each, with a button that fits the block around the class. Shown on the Calendar's Week and Day views and on the Week page. */
export function ClashNotices({ template }: { template: WeekTemplate | undefined }) {
  const { courses, semesters } = useApp();
  const routine = useRoutine();
  const classes = useMemo(() => classSlots(template, semesters, courses), [template, semesters, courses]);
  const templateBlocks = useMemo(() => routine.blocks.filter((b) => b.templateId === template?.id), [routine.blocks, template]);
  const clashes = useMemo(() => weeklyClashes(templateBlocks, classes), [templateBlocks, classes]);

  function fit(c: (typeof clashes)[number]) {
    const changes = c.blockIds.flatMap((id) => {
      const block = templateBlocks.find((b) => b.id === id)!;
      const others = classes.filter((x) => x.weekday === block.weekday && !(x.title === c.classTitle && x.start === c.classStart));
      const fitted = fitAround(block, { start: c.classStart, end: c.classEnd }, others);
      return fitted ? [{ block, ...fitted }] : [];
    });
    if (changes.length > 0) void routine.retimeBlocks(changes, `${c.blockTitle} now fits around ${c.classTitle}`);
  }

  return (
    <>
      {clashes.map((c) => (
        <div key={`${c.classTitle}|${c.blockTitle}|${c.classStart}`} role="status" className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-panel border border-rule bg-surface px-4 py-2.5">
          <p className="text-body">
            {c.classTitle.split(' ').slice(0, 2).join(' ')} overlaps {c.blockTitle} every {c.weekdays.map((w) => WEEKDAY_NAME[w]).join(' and ')}. Adjust the template?
            <span className="block text-meta text-ink-muted">
              From Courses: {c.classTitle} meets {c.weekdays.map((w) => WEEKDAY_NAME[w]!.slice(0, 3)).join(', ')} {formatTimeRange(c.classStart, c.classEnd)}.
            </span>
          </p>
          <Button variant="secondary" onClick={() => fit(c)}>
            Fit {c.blockTitle} around the class
          </Button>
        </div>
      ))}
    </>
  );
}
