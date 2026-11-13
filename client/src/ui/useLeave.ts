import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

// The sequence, from the click: the line draws for 250ms; at 400ms the item starts to fade and collapse (250ms); when that finishes, the change is committed and the list drops it.
const COLLAPSE_AFTER_MS = 400;
const COLLAPSE_MS = 250;

/** Checking off something that leaves its list: it is struck through, fades and collapses, and only then is the change saved. Checking again early cancels. With reduced motion, or when nothing leaves, it is saved at once. */
export function useLeave(done: boolean, leaveOnComplete: boolean, onToggle: () => void) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState<'idle' | 'striking' | 'collapsing'>('idle');
  const timers = useRef<number[]>([]);
  const commit = useRef(onToggle);
  commit.current = onToggle;
  const phase = useRef(leaving);
  phase.current = leaving;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // If it is removed mid-animation, still save the change the person asked for.
  useEffect(
    () => () => {
      clearTimers();
      if (phase.current !== 'idle') commit.current();
    },
    [],
  );
  // Something that becomes un-done again (e.g. via Undo) starts fresh.
  useEffect(() => {
    if (!done) setLeaving('idle');
  }, [done]);

  function toggle() {
    if (!leaveOnComplete || done || reduced) {
      onToggle();
      return;
    }
    if (leaving === 'striking') {
      // Changed their mind before it started to leave: cancel.
      clearTimers();
      setLeaving('idle');
      return;
    }
    if (leaving !== 'idle') return;
    setLeaving('striking');
    timers.current = [
      window.setTimeout(() => setLeaving('collapsing'), COLLAPSE_AFTER_MS),
      window.setTimeout(() => {
        phase.current = 'idle'; // committed: the unmount cleanup must not commit again
        commit.current();
      }, COLLAPSE_AFTER_MS + COLLAPSE_MS),
    ];
  }

  return { leaving, checked: done || leaving !== 'idle', toggle };
}
