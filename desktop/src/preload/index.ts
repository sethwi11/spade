import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopCommand, SpadeBridge } from '@todo/shared';

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
};

// Named things the page may listen for, and nothing it can call into: all data goes through the API.
contextBridge.exposeInMainWorld('spade', bridge);
