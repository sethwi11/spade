import { Component, type ErrorInfo, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';

interface State {
  failed: boolean;
}

/** If something on a page throws while drawing, show a message instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode; /** Room around the message on a page that has no frame of its own (the home screen). */ className?: string }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A page failed to draw:', error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className={cx('max-w-[960px] py-10', this.props.className)}>
        <h1 className="font-display text-page">Something went wrong</h1>
        <p className="mt-2 mb-5 font-display text-title text-ink-muted italic">This page hit a problem and couldn’t be drawn. Your data is safe.</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </div>
    );
  }
}
