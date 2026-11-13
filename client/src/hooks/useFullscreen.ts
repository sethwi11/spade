import { useEffect } from 'react';

// Spade runs in its own full-screen space, so there is no button for this. Shift+F stays for a window that isn't full screen.

const toggle = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
};

/** Shift+F turns full screen on or off. */
export function useFullscreenShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
      if (e.key === 'F' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && !typing && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
