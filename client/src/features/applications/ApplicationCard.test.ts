import { describe, expect, it } from 'vitest';
import { applicationPill } from './ApplicationCard';

const today = '2026-11-12';
const app = (status: Parameters<typeof applicationPill>[0]['status'], deadline: string | null = null) => ({ status, deadline });

describe('the pill on an application card', () => {
  it('says Offer for an offer, and how a closed one ended', () => {
    expect(applicationPill(app('Offer'), false, today)).toMatchObject({ text: 'Offer', tone: 'green' });
    expect(applicationPill(app('Rejected'), false, today)?.text).toBe('Rejected');
    expect(applicationPill(app('Withdrawn'), false, today)?.text).toBe('Withdrawn');
  });

  it('asks "Follow up?" when the wait has gone on, in honey', () => {
    expect(applicationPill(app('Applied'), true, today)).toMatchObject({ text: 'Follow up?', tone: 'honey' });
  });

  it('shows a wishlist deadline only when it is within a week, or already past', () => {
    expect(applicationPill(app('Wishlist', '2026-11-19'), false, today)?.text).toMatch(/^Deadline Nov 19/);
    expect(applicationPill(app('Wishlist', '2026-11-05'), false, today)?.text).toMatch(/^Deadline Nov 5/);
    expect(applicationPill(app('Wishlist', '2026-11-20'), false, today)).toBeNull();
    expect(applicationPill(app('Wishlist'), false, today)).toBeNull();
  });

  it('says nothing for an ordinary application, and an offer outranks a stale follow-up', () => {
    expect(applicationPill(app('Interviewing'), false, today)).toBeNull();
    expect(applicationPill(app('Online Assessment'), false, today)).toBeNull();
    expect(applicationPill(app('Offer'), true, today)?.text).toBe('Offer');
  });
});
