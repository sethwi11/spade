import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useFullscreenShortcut } from '../hooks/useFullscreen';

/** Things that belong to the whole window, whichever page is open. */
export function WindowEffects() {
  const navigate = useNavigate();
  useFullscreenShortcut();
  // Launched again with an address (clicking a pop-up opens the installed window at its page): the window that's already open comes to the front and goes there.
  useEffect(() => {
    const queue = (window as unknown as { launchQueue?: { setConsumer(fn: (params: { targetURL?: string }) => void): void } }).launchQueue;
    queue?.setConsumer(({ targetURL }) => {
      const url = targetURL ? new URL(targetURL) : null;
      if (url && url.origin === window.location.origin) navigate(url.pathname + url.search);
    });
  }, [navigate]);
  // The desktop app's menus and pop-ups ask for a page the same way.
  useEffect(() => window.spade?.onNavigate((path) => path.startsWith('/') && !path.startsWith('//') && navigate(path)), [navigate]);
  // The Mac app has no title bar: the top edge of every page drags the window instead. 24px, which is padding on every page, so it never covers a control.
  return window.spade?.platform === 'darwin' ? <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-6 [-webkit-app-region:drag]" /> : null;
}
