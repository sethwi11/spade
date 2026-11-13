import { useSyncExternalStore } from 'react';
import { todayLocalISO } from '../lib/dates';
import { clock } from './clock';

/** Today's local date. It moves on at midnight (or when a sleeping Mac wakes after it), so an app left open overnight shows the new day: Today, Overdue and every "due today" check follow. */
export const useToday = (): string => useSyncExternalStore(clock.subscribe, () => todayLocalISO(clock.get()));
