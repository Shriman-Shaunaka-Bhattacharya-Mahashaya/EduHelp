// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, ThemeSwitcher } from '@/components/ThemeProvider';
import DashboardNav from '@/components/DashboardNav';

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

describe('theme selector', () => {
  it('changes the document and persists the selected preference', async () => {
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Color theme' }), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('eduhelp-theme')).toBe('dark');
  });
  it('restores a saved preference', () => {
    localStorage.setItem('eduhelp-theme', 'dark');
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    expect(screen.getByRole('combobox')).toHaveValue('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('synchronizes changes from another tab and storage clearing', () => {
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'eduhelp-theme', newValue: 'dark' })));
    expect(screen.getByRole('combobox')).toHaveValue('dark');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
    expect(screen.getByRole('combobox')).toHaveValue('system');
  });
  it('still changes theme if local storage writes fail', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('workspace navigation', () => {
  it('marks the current section and dispatches selection', async () => {
    const select = vi.fn();
    render(<DashboardNav active="exams" onChange={select} items={[{ id: 'exams', label: 'Exams' }, { id: 'messages', label: 'Messages', count: 105 }]} />);
    expect(screen.getByRole('button', { name: 'Exams' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('105 unread messages')).toHaveTextContent('99+');
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }));
    expect(select).toHaveBeenCalledWith('messages');
  });
});
