import { describe, expect, it } from 'vitest';
import { DesktopPrefsChangeSchema, parseSpadeLink, shortcutFrom, shortcutLabel } from '../src';

const ID = '00000000-0000-4000-8000-000000000001';

describe('spade:// links', () => {
  it('open a page', () => {
    expect(parseSpadeLink('spade://today')).toEqual({ path: '/today' });
    expect(parseSpadeLink('spade://calendar/')).toEqual({ path: '/calendar' });
    expect(parseSpadeLink('spade://home')).toEqual({ path: '/' });
  });
  it('open a to-do by its id', () => {
    expect(parseSpadeLink(`spade://task/${ID}`)).toEqual({ path: `/tasks?task=${ID}` });
  });
  it('hand text to the quick-add panel, tidied and capped', () => {
    expect(parseSpadeLink('spade://add?text=Email%20Dr.%20Okafor%0Aabout%20the%20lab')).toEqual({ add: 'Email Dr. Okafor about the lab' });
    expect((parseSpadeLink(`spade://add?text=${'x'.repeat(500)}`) as { add: string }).add).toHaveLength(200);
    expect(parseSpadeLink('spade://add')).toEqual({ add: '' });
  });
  it('open Today for anything else', () => {
    for (const junk of ['spade://nowhere', 'spade://task/not-an-id', `spade://task/${ID}/../../settings`, 'spade://today/../../etc/passwd', 'https://example.com/today', 'javascript:alert(1)', 'not a link', `spade://add?text=${'x'.repeat(3000)}`, 'spade://constructor'])
      expect(parseSpadeLink(junk), junk).toEqual({ path: '/today' });
  });
});

describe('the quick-add shortcut', () => {
  const press = (over: object) => shortcutFrom({ key: ' ', code: 'Space', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...over });
  it('is read from a key press with Control, Option or Command', () => {
    expect(press({ ctrlKey: true, altKey: true })).toBe('Control+Alt+Space');
    expect(press({ key: '˚', code: 'KeyK', altKey: true, metaKey: true })).toBe('Alt+Command+K');
  });
  it('needs a modifier that other typing doesn\'t use, and a plain key', () => {
    expect(press({})).toBeNull();
    expect(press({ shiftKey: true, key: 'A', code: 'KeyA' })).toBeNull();
    expect(press({ ctrlKey: true, key: 'Control', code: 'ControlLeft' })).toBeNull();
  });
  it('shows as Mac symbols', () => {
    expect(shortcutLabel('Control+Alt+Space')).toBe('⌃⌥Space');
  });
  it('refuses a made-up setting or shortcut from the page', () => {
    expect(DesktopPrefsChangeSchema.safeParse({ badge: false }).success).toBe(true);
    expect(DesktopPrefsChangeSchema.safeParse({ run: 'rm -rf' }).success).toBe(false);
    expect(DesktopPrefsChangeSchema.safeParse({ quickAddShortcut: 'Space' }).success).toBe(false);
  });
});
