import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { dueNow, type Popup } from '@todo/shared';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/connection';
import { desktopState } from '../src/popups';
import { createRepositories } from '../src/repositories';

const setup = () => {
  const repos = createRepositories(openDatabase(':memory:'));
  const sent: Popup[] = [];
  return { repos, sent, app: createApp(repos, { uploadsDir: '/tmp', sendPopup: (p) => sent.push(p) }) };
};

const BEFORE = { blocks: true, bedtime: true };
const titles = (ps: Popup[]) => ps.map((p) => p.title);

describe('what the desktop app plans from', () => {
  it('lists the planned day, so what is due this minute shows once', async () => {
    const { repos, app } = setup();
    await request(app).patch('/api/settings').send({ popups: BEFORE }).expect(200);
    const { body: t } = await request(app).post('/api/week-templates').send({ name: 'Made-up week', effectiveFrom: '2026-09-01', days: [{ weekday: 3, wake: '07:00', bed: '22:00' }] }).expect(201);
    await request(app).post('/api/routine-blocks').send({ templateId: t.id, weekday: 3, start: '09:00', end: '10:00', title: 'Study' }).expect(201);
    const { popups, summary } = await desktopState(repos, '2026-11-11T09:00');
    expect(dueNow(popups, '2026-11-11T08:58', '2026-11-11T08:59', new Set()).show).toEqual([]);
    const { show } = dueNow(popups, '2026-11-11T08:59', '2026-11-11T09:00', new Set());
    expect(titles(show)).toEqual(['Now: Study until 10:00 AM']);
    expect(dueNow(popups, '2026-11-11T08:59', '2026-11-11T09:00', new Set(show.flatMap((p) => p.keys))).show).toEqual([]);
    expect(summary.now).toMatchObject({ title: 'Study', end: '2026-11-11T10:00' });
  });

  it('is empty when pop-ups are turned off in settings', async () => {
    const { repos, app } = setup();
    await request(app).patch('/api/settings').send({ popups: { enabled: false } }).expect(200);
    await request(app).post('/api/tasks').send({ title: 'Call', dueDate: '2026-11-11', dueTime: '12:00' }).expect(201);
    expect((await desktopState(repos, '2026-11-11T12:00')).popups).toEqual([]);
  });

  it('has bedtime at 2:00 AM after a late night, once, though two days list it', async () => {
    const { repos, app } = setup();
    await request(app).patch('/api/settings').send({ popups: BEFORE }).expect(200);
    await request(app).post('/api/week-templates').send({ name: 'Made-up week', effectiveFrom: '2026-09-01', days: [{ weekday: 5, wake: '06:00', bed: '02:00' }] }).expect(201);
    // Saturday, 2:00 AM: Friday's bedtime.
    const { popups } = await desktopState(repos, '2026-11-14T02:00');
    expect(titles(dueNow(popups, '2026-11-14T01:59', '2026-11-14T02:01', new Set()).show)).toEqual(['Bedtime. Tomorrow starts at 6:00 AM']);
  });

  it('has the Sunday review reminder at 8:30 PM only when that setting is on', async () => {
    const { repos, app } = setup();
    const review = async () => (await desktopState(repos, '2026-11-08T20:30')).popups.filter((p) => p.kind === 'review');
    expect(await review()).toEqual([]);
    await request(app).patch('/api/settings').send({ sundayReviewReminder: true }).expect(200);
    expect((await review()).map((p) => [p.at, p.url])).toEqual([['2026-11-08T20:30', '/review']]);
  });

  it('answers over the API, with the menu bar summary and the badge count', async () => {
    const { app } = setup();
    await request(app).post('/api/tasks').send({ title: 'Overdue made-up to-do', dueDate: '2020-01-01' }).expect(201);
    const { body } = await request(app).get('/api/desktop/state').expect(200);
    expect(body.summary.badge).toBe(1);
    expect(Array.isArray(body.popups)).toBe(true);
  });

  it('says when something was saved, and not when something was only read or refused', async () => {
    let changes = 0;
    const app = createApp(createRepositories(openDatabase(':memory:')), { uploadsDir: '/tmp', onChange: () => changes++ });
    await request(app).get('/api/tasks').expect(200);
    await request(app).post('/api/tasks').send({}).expect(400);
    expect(changes).toBe(0);
    await request(app).post('/api/tasks').send({ title: 'Made-up to-do' }).expect(201);
    expect(changes).toBe(1);
  });

  it('sends a test pop-up on request, and says so outside the desktop app', async () => {
    const { sent, app } = setup();
    await request(app).post('/api/popups/test').expect(204);
    expect(sent).toHaveLength(1);
    const quiet = createApp(createRepositories(openDatabase(':memory:')), { uploadsDir: '/tmp' });
    await request(quiet).post('/api/popups/test').expect(409);
  });
});
