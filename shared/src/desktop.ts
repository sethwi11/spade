/** What a desktop menu item can ask the page to do. */
export type DesktopCommand = 'new-task' | 'new-event' | 'import' | 'search' | 'undo' | 'settings' | 'shortcuts';

/** `window.spade`: what the desktop app adds to the page. Undefined in a browser, where everything must still work. Each `on…` returns a function that stops listening. */
export interface SpadeBridge {
  platform: string;
  version: string;
  /** The app asks the page to open an address (a menu item, a clicked pop-up). */
  onNavigate(listener: (path: string) => void): () => void;
  onCommand(listener: (command: DesktopCommand) => void): () => void;
}
