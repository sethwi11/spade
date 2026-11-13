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
  return null;
}
