import { describe, expect, it } from 'vitest';
import { parseTheme, resolveTheme, themeScript } from '@/lib/theme';
import { runInNewContext } from 'node:vm';

describe('theme preferences', () => {
  it.each(['light', 'dark'] as const)('preserves %s', value => expect(parseTheme(value)).toBe(value));
  it.each([null, '', 'system', 'invalid', '<script>'])('falls back to system for %s', value => expect(parseTheme(value)).toBe('system'));
  it.each([
    ['system', true, 'dark'], ['system', false, 'light'],
    ['light', true, 'light'], ['light', false, 'light'],
    ['dark', true, 'dark'], ['dark', false, 'dark'],
  ] as const)('resolves %s with OS dark=%s to %s', (preference, os, result) => expect(resolveTheme(preference, os)).toBe(result));
  it.each([true, false])('initializes before hydration even when storage is blocked (dark=%s)', dark => {
    const root = { dataset: {}, style: {} };
    runInNewContext(themeScript, { document: { documentElement: root }, localStorage: { getItem() { throw new Error('blocked'); } }, window: { matchMedia: () => ({ matches: dark }) } });
    expect(root.dataset).toEqual({ theme: dark ? 'dark' : 'light' });
    expect(root.style).toEqual({ colorScheme: dark ? 'dark' : 'light' });
  });
});
