import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { WeekTemplate } from '@todo/shared';
import { useRoutine, type BlockFields, type TemplateFields } from '../../actions/useRoutineActions';
import { useApp } from '../../app/AppContext';
import { WEEKDAY_NAME } from '../../lib/dates';
import { Button } from '../../ui/Button';
import { Field, Label, Select } from '../../ui/fields';
import { Dialog } from '../../ui/Panel';
import { WeekdayPicker } from '../../ui/WeekdayPicker';
import { BlockDialog, type BlockDialogState } from './BlockDialog';
import { TemplateDialog, type TemplateDialogState } from './TemplateDialog';

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

/** The weekly routine's dialogs, opened from anywhere (the Calendar, Today, the home screen, the Week page): one block, one template, and copying a day to other days. */
export function RoutineDialogs() {
  const { dialog, closeDialog } = useApp();
  const routine = useRoutine();
  const navigate = useNavigate();
  const onWeekPage = useLocation().pathname === '/week';

  const block = dialog?.kind === 'block' && dialog.mode === 'edit' ? routine.blocks.find((b) => b.id === dialog.id) : undefined;
  const blockState: BlockDialogState | null = dialog?.kind === 'block' ? (dialog.mode === 'new' ? { mode: 'new', defaults: dialog.defaults } : block ? { mode: 'edit', block } : null) : null;
  const template = dialog?.kind === 'template' && dialog.mode !== 'new' ? routine.templates.find((t) => t.id === dialog.id) : undefined;
  const templateState: TemplateDialogState | null = dialog?.kind === 'template' ? (dialog.mode === 'new' ? { mode: 'new' } : template ? { mode: dialog.mode, template } : null) : null;

  async function saveBlock(fields: BlockFields, copyTo: number[], existing?: Parameters<typeof routine.saveBlock>[1]) {
    const saved = await routine.saveBlock(fields, existing);
    if (saved && copyTo.length > 0) await routine.copyBlocks([saved], copyTo.map((weekday) => ({ weekday })), `Copied “${saved.title}” to ${copyTo.length} more ${copyTo.length === 1 ? 'day' : 'days'}`);
    return saved !== null;
  }

  async function saveTemplate(fields: TemplateFields) {
    const made: WeekTemplate | null = templateState?.mode === 'duplicate' ? await routine.duplicateTemplate(templateState.template, fields) : await routine.saveTemplate(fields, templateState?.mode === 'edit' ? templateState.template : undefined);
    // The Week page shows one template at a time: it follows you to the one you just made.
    if (made && onWeekPage) navigate(`/week?template=${made.id}`, { replace: true });
    return made !== null;
  }

  return (
    <>
      <BlockDialog state={blockState} onClose={() => closeDialog('block')} onSave={saveBlock} onDelete={(b) => void routine.deleteBlock(b)} onDuplicate={(b) => void routine.copyBlocks([b], [{ weekday: b.weekday }], `Duplicated “${b.title}”`)} />
      <TemplateDialog state={templateState} onClose={() => closeDialog('template')} onSave={saveTemplate} onDelete={(t) => void routine.deleteTemplate(t)} />
      <CopyDayDialog />
    </>
  );
}

/** Copy every block on one day onto other days of the same template. */
function CopyDayDialog() {
  const { dialog, closeDialog } = useApp();
  const { blocks, copyBlocks } = useRoutine();
  const open = dialog?.kind === 'copyDay' ? dialog : null;
  const [from, setFrom] = useState(1);
  const [targets, setTargets] = useState<number[]>([]);
  useEffect(() => {
    setFrom(open?.weekday ?? 1);
    setTargets([]);
  }, [open?.templateId, open?.weekday]);

  const source = open ? blocks.filter((b) => b.templateId === open.templateId && b.weekday === from) : [];
  const to = targets.filter((d) => d !== from);
  const close = () => closeDialog('copyDay');

  return (
    <Dialog
      open={open !== null}
      onClose={close}
      title="Copy a day"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={to.length === 0 || source.length === 0}
            onClick={() => {
              void copyBlocks(source, to.map((weekday) => ({ weekday })), `Copied ${WEEKDAY_NAME[from]}’s ${source.length} ${source.length === 1 ? 'block' : 'blocks'} to ${to.length} more ${to.length === 1 ? 'day' : 'days'}`);
              close();
            }}
          >
            Copy
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Copy every block on">
          {(p) => (
            <Select {...p} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
              {MONDAY_FIRST.map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_NAME[d]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div>
          <Label>Add a copy on</Label>
          <WeekdayPicker value={targets} onChange={setTargets} mondayFirst disabled={[from]} />
        </div>
        <p className="text-meta text-ink-muted">{source.length === 0 ? 'There are no blocks on that day.' : 'Blocks already on those days stay. Undo removes the copies.'}</p>
      </div>
    </Dialog>
  );
}
