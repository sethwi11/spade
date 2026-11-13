/** Milliseconds from `now` until the clock next shows a new minute (0 seconds). */
export function msUntilNextMinute(now: Date): number {
  return 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
}

/** One clock for the whole app, ticking each minute for whoever is listening. A sleeping Mac pauses timers, so after waking a timer alone can be hours late (a task due Thursday still said "Tomorrow"): the clock also re-reads the time the moment the window wakes. */
export function createClock(read: () => Date, wake: [EventTarget, string][]) {
  let current = read();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const refresh = () => {
    current = read();
    listeners.forEach((l) => l());
    clearTimeout(timer);
    timer = setTimeout(refresh, msUntilNextMinute(current) + 50); // a hair after the minute, so we never land just before it
  };

  return {
    get: () => current,
    subscribe(listener: () => void) {
      if (listeners.size === 0) {
        current = read();
        for (const [target, event] of wake) target.addEventListener(event, refresh);
        timer = setTimeout(refresh, msUntilNextMinute(current) + 50);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        clearTimeout(timer);
        for (const [target, event] of wake) target.removeEventListener(event, refresh);
      };
    },
  };
}

export const clock = createClock(() => new Date(), typeof window === 'undefined' ? [] : [[window, 'focus'], [document, 'visibilitychange']]);
