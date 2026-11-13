import { describe, expect, it } from 'vitest';
import { railItems } from './railItems';

describe('the menu', () => {
  it('shows Today, Calendar, Tasks, Applications, Courses and Journal, and keeps Week, Money, Path and Review out of it', () => {
    expect(railItems(false).map((i) => i.label)).toEqual(['Today', 'Calendar', 'Tasks', 'Applications', 'Courses', 'Journal']);
  });

  it('brings the hidden pages back in their old places when asked', () => {
    expect(railItems(true).map((i) => i.label)).toEqual(['Today', 'Calendar', 'Week', 'Tasks', 'Applications', 'Courses', 'Money', 'Path', 'Review', 'Journal']);
  });

  it('points Today at /today (the home screen is /)', () => {
    expect(railItems(false)[0]!.to).toBe('/today');
  });
});
