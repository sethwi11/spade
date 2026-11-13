import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CopyPlus, Plus, Settings2 } from 'lucide-react';
import { activeTemplate, openBumps } from '@todo/shared';
import { MissedList, weekOf } from '../features/today/MissedList';
import { useNowText, usePlanSources } from '../features/today/useTodayPlan';
import { useApp } from '../app/AppContext';
import { ClashNotices } from '../features/week/ClashNotices';
import { classSlots } from '../features/week/classSlots';
import { WeekGrid, type Slot } from '../features/week/WeekGrid';
import { WEEKDAY_NAME, longDate } from '../lib/dates';
import { Button } from '../ui/Button';
import { Select } from '../ui/fields';
import { Segmented } from '../ui/Segmented';
import { EmptyState, SkeletonRows } from '../ui/states';

const isPhone = () => typeof matchMedia === 'function' && matchMedia('(max-width: 767px)').matches;
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAY_NAME[d]!.slice(0, 2), title: WEEKDAY_NAME[d] }));

/** My week: the routine template as a grid, Monday first. Drag to move or stretch a block; click one to edit it. Hidden from the menu (the Calendar does all of this too), but still here. */
export default function WeekPage() {
  const { today, courses, semesters, calendarsById, openDialog } = useApp();
  const { src, routine } = usePlanSources();
  const { templates, blocks } = routine;
  const now = useNowText();
  const bumps = useMemo(() => openBumps(src, ...weekOf(now.slice(0, 10))), [src, now]);
  const [params, setParams] = useSearchParams();
  const [day, setDay] = useState<number | null>(() => (isPhone() ? new Date().getDay() : null));

  const template = templates.find((t) => t.id === params.get('template')) ?? activeTemplate(templates, today) ?? templates[0];
  const templateBlocks = useMemo(() => blocks.filter((b) => b.templateId === template?.id), [blocks, template]);
  const classes = useMemo(() => classSlots(template, semesters, courses), [template, semesters, courses]);

  // Old links (Today's agenda used to send you here) open that block to edit.
  const linked = params.get('block');
  useEffect(() => {
    const block = linked ? blocks.find((b) => b.id === linked) : undefined;
    if (!block) return;
    openDialog({ kind: 'block', mode: 'edit', id: block.id });
    setParams((p) => {
      p.delete('block');
      p.set('template', block.templateId);
      return p;
    }, { replace: true });
  }, [linked, blocks, setParams, openDialog]);

  if (routine.loading) return <SkeletonRows count={6} />;

  if (!template) {
    return (
      <div>
        <h1 className="mb-6 font-display text-page">Week</h1>
        <EmptyState message="No week template yet. A template is the routine you follow every week, with the dates it applies to.">
          <Button variant="primary" icon={Plus} onClick={() => openDialog({ kind: 'template', mode: 'new' })}>
            New template
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col [&>*]:shrink-0">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-page leading-none">Week</h1>
          <p className="mt-1 text-meta text-ink-muted">
            {templates.length > 1 ? (
              <Select aria-label="Template" value={template.id} wrapperClassName="inline-block" className="h-7 w-auto" onChange={(e) => setParams({ template: e.target.value })}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="font-medium text-ink">{template.name}</span>
            )}{' '}
            · {longDate(template.effectiveFrom)} to {template.effectiveTo ? longDate(template.effectiveTo) : 'no end date'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={Plus} onClick={() => openDialog({ kind: 'block', mode: 'new', defaults: { templateId: template.id, weekday: day ?? 1, start: '09:00', end: '10:00' } })}>
            New block
          </Button>
          <Button variant="secondary" icon={Settings2} onClick={() => openDialog({ kind: 'template', mode: 'edit', id: template.id })}>
            Template
          </Button>
          <Button variant="secondary" icon={CopyPlus} onClick={() => openDialog({ kind: 'template', mode: 'duplicate', id: template.id })}>
            Duplicate
          </Button>
        </div>
      </header>

      <ClashNotices template={template} />

      {day !== null && <Segmented label="Day" value={String(day)} onChange={(v) => setDay(Number(v))} options={DAY_OPTIONS} className="mb-3 self-start" />}

      <div className="min-h-[30rem] flex-1 shrink!">
        <WeekGrid
          blocks={templateBlocks}
          classes={classes}
          calendarsById={calendarsById}
          day={day}
          onOpen={(block) => openDialog({ kind: 'block', mode: 'edit', id: block.id })}
          onCreate={(slot: Slot) => openDialog({ kind: 'block', mode: 'new', defaults: { templateId: template.id, ...slot } })}
          onMove={(block, slot) => routine.moveBlock(block, slot)}
          onCopyDay={(weekday) => openDialog({ kind: 'copyDay', templateId: template.id, weekday })}
        />
      </div>
      <p className="mt-2 text-meta text-ink-muted">Classes come from Courses. Where two blocks overlap, the stronger one (commitment, then high) takes the time and shows “+1 hidden”; the hidden block comes back on a day the stronger one is skipped.</p>
      {bumps.length > 0 && (
        <div className="mt-4 max-h-56 overflow-y-auto">
          <MissedList bumps={bumps} src={src} now={now} />
        </div>
      )}
    </div>
  );
}
