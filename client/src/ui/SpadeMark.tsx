/** The Spade mark: a plain spade silhouette in the current text color. The same shape is in public/favicon.svg. */
export const SPADE_PATH = 'M50 4C43 16 12 34 12 56c0 12 8 22 19 22 6 0 12-2 15-6-1 11-4 18-11 23h30c-7-5-10-12-11-23 3 4 9 6 15 6 11 0 19-10 19-22C88 34 57 16 50 4Z';

export function SpadeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden className={className}>
      <path d={SPADE_PATH} />
    </svg>
  );
}
