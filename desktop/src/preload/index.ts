import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopAct, DesktopCommand, FocusState, SpadeBridge } from '@todo/shared';

/** One listener per channel. What arrives before the page is listening (a menu item chosen while the window was still opening) waits for it. */
function channel<T>(name: string) {
  const waiting: T[] = [];
  let listener: ((value: T) => void) | undefined;
  ipcRenderer.on(name, (_event, value: T) => (listener ? listener(value) : waiting.push(value)));
  return (next: (value: T) => void) => {
    listener = next;
    waiting.splice(0).forEach(next);
    return () => {
      if (listener === next) listener = undefined;
    };
  };
}

const bridge: SpadeBridge = {
  platform: process.platform,
  version: process.argv.find((arg) => arg.startsWith('--spade-version='))?.slice('--spade-version='.length) ?? '',
  onNavigate: channel<string>('spade:navigate'),
  onCommand: channel<DesktopCommand>('spade:command'),
  onActed: channel<DesktopAct>('spade:acted'),
  onOpenFile: channel<{ name: string; data: Uint8Array }>('spade:open-file'),
  onQuickAdd: channel<string>('spade:quick-add'),
  quickAddDone: (added) => ipcRenderer.invoke('spade:quick-add-done', added),
  onFocus: channel<FocusState | null>('spade:focus'),
  focusStart: (item) => ipcRenderer.invoke('spade:focus-start', item),
  focusStop: () => ipcRenderer.invoke('spade:focus-stop'),
  getPrefs: () => ipcRenderer.invoke('spade:get-prefs'),
  setPrefs: (changes) => ipcRenderer.invoke('spade:set-prefs', changes),
};

// Named things the page may listen for and a few named actions (each checked again in main/ipc.ts). All data still goes through the API.
contextBridge.exposeInMainWorld('spade', bridge);
