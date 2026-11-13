import { useSyncExternalStore } from 'react';
import { clock } from './clock';

/** The current time, refreshed each minute and the moment the window wakes. */
export const useNow = (): Date => useSyncExternalStore(clock.subscribe, clock.get);
