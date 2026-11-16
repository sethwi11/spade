import { describe, expect, it } from 'vitest';
import { focusSession, nextPhase, startFocus } from '../src';

const f = { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 2, sound: true, notify: true };
const MIN = 60_000;
const at = (time: string) => new Date(`2026-11-11T${time}:00`).getTime();
const block = { key: 'routine:study', title: 'Study', end: '2026-11-11T11:00' };

describe('the focus timer', () => {
  it('starts with a focus interval, cut short by the end of the block', () => {
    expect(startFocus(block, at('09:00'), f)).toMatchObject({ phase: 'focus', phaseEnd: at('09:25'), done: 0 });
    expect(startFocus(block, at('10:50'), f)).toMatchObject({ phaseEnd: at('11:00') });
    expect(startFocus(block, at('11:00'), f)).toBeNull();
  });

  it('alternates focus and breaks, with a long break every second focus, until the block ends', () => {
    let s = startFocus(block, at('09:00'), f)!;
    const phases: string[] = [];
    for (;;) {
      phases.push(`${s.phase} ${(s.phaseEnd - s.phaseStart) / MIN}`);
      const next = nextPhase(s, s.phaseEnd, f);
      if (!next) break;
      s = next;
    }
    expect(phases).toEqual(['focus 25', 'break 5', 'focus 25', 'break 15', 'focus 25', 'break 5', 'focus 20']);
  });

  it('ends at once when the block ended while the computer slept', () => {
    expect(nextPhase(startFocus(block, at('09:00'), f)!, at('11:30'), f)).toBeNull();
  });

  it('saves a stretch of a minute or more', () => {
    expect(focusSession(at('09:00'), at('09:25'))).toMatchObject({ durationSeconds: 1500, taskId: null });
    expect(focusSession(at('09:00'), at('09:00') + 59_000)).toBeNull();
  });
});
