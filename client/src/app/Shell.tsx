import { Suspense } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useShortcuts } from '../hooks/useShortcuts';
import { cx } from '../lib/cx';
import { BadgeAwards } from '../features/path/BadgeAwards';
import { SpadeMark } from '../ui/SpadeMark';
import { useApp } from './AppContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Rail, TabBar } from './Rail';

/** The frame around every page except the home screen: the rail on the left (a tab bar along the bottom on a phone), and the page itself. */
export function Shell() {
  const app = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const fullHeight = location.pathname === '/calendar' || location.pathname === '/week';
  // The boards fill the window on a wide screen, so each column scrolls by itself instead of the page.
  const boardPage = location.pathname === '/tasks' || location.pathname === '/applications';

  useShortcuts({
    // The quick-add bar if this page has one (the Calendar doesn't), else the form.
    newTask: () => {
      const bar = document.getElementById('quick-add');
      if (bar) bar.focus();
      else app.openDialog({ kind: 'task', mode: 'new', defaults: {} });
    },
    search: () => {
      const focus = () => document.getElementById('task-search')?.focus();
      if (document.getElementById('task-search')) return focus();
      navigate('/tasks'); // search lives on the Tasks page: go there, then focus it
      window.setTimeout(focus, 60);
    },
    undo: () => void app.undoLast(),
    showHelp: () => app.openDialog({ kind: 'shortcuts' }),
  });

  return (
    <div className="md:flex">
      {/* The first stop for a keyboard: skip the menu's many links and land on the page. */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-body focus:shadow-popover"
      >
        Skip to main content
      </a>
      <Rail />

      <div className="min-w-0 flex-1">
        <div className="flex h-12 items-center border-b border-hairline px-4 md:hidden">
          <Link to="/" aria-label="Spade home" className="flex items-center gap-2">
            <SpadeMark className="size-6" />
            <span className="font-display text-section italic">Spade</span>
          </Link>
        </div>
        {/* The calendar fills the screen instead of scrolling the page: its grid scrolls inside it. */}
        <main
          id="main"
          tabIndex={-1}
          className={
            fullHeight
              ? 'flex h-[calc(100dvh-7.5rem)] flex-col px-3 pt-3 pb-2 outline-none sm:px-5 md:h-dvh md:px-8 md:pt-6 md:pb-4'
              : cx('px-5 pt-6 pb-28 outline-none sm:px-8 md:px-10 md:pt-10', boardPage && 'md:flex md:h-dvh md:flex-col md:overflow-hidden md:pt-8 md:pb-6')
          }
        >
          {/* Keyed by address, so leaving a page that crashed clears the message. */}
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<p className="font-display text-title text-ink-muted italic">Loading…</p>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <TabBar />
      <BadgeAwards />
    </div>
  );
}
